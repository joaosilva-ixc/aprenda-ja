import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";

export const runtime = "nodejs";

function startOfDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function formatDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

function lastDays(days: number) {
  const out: { date: Date; key: string; label: string }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = startOfDay(d);
    out.push({
      date,
      key: formatDay(date),
      label: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    });
  }
  return out;
}

export async function GET() {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  const since = startOfDay(new Date());
  since.setDate(since.getDate() - 13);

  const [themes, topVideos, byTheme, lastAccess, totalAulas, totalAlunos, totalViews, viewsByDay, alunosEngagement, totalAulaCount] =
    await Promise.all([
      prisma.theme.findMany({
        select: { id: true, name: true, color: true },
        orderBy: { name: "asc" },
      }),
      prisma.aula.findMany({
        where: { viewCount: { gt: 0 } },
        select: {
          id: true,
          title: true,
          viewCount: true,
          theme: { select: { id: true, name: true, color: true } },
        },
        orderBy: { viewCount: "desc" },
        take: 6,
      }),
      prisma.aula.groupBy({
        by: ["themeId"],
        _sum: { viewCount: true },
      }),
      prisma.user.findMany({
        where: { role: "ALUNO", lastAccessAt: { not: null } },
        select: { id: true, name: true, email: true, lastAccessAt: true },
        orderBy: { lastAccessAt: "desc" },
        take: 10,
      }),
      prisma.aula.count(),
      prisma.user.count(),
      prisma.aula.aggregate({ _sum: { viewCount: true } }),
      prisma.aulaProgress.findMany({
        where: { lastAccessedAt: { gte: since } },
        select: { lastAccessedAt: true },
      }),
      prisma.user.findMany({
        where: { role: "ALUNO" },
        select: {
          id: true,
          name: true,
          email: true,
          streakCount: true,
          lastAccessAt: true,
          progress: { select: { completed: true, favorite: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.aula.count(),
    ]);

  const viewsByTheme = themes.map((t) => {
    const views = byTheme.find((b) => b.themeId === t.id)?._sum.viewCount ?? 0;
    return { themeId: t.id, name: t.name, color: t.color, views };
  });

  const total = viewsByTheme.reduce((acc, t) => acc + t.views, 0);
  const perTheme = viewsByTheme.map((t) => ({
    ...t,
    percent: total ? Math.round((t.views / total) * 100) : 0,
  }));

  const dayMap = new Map<string, number>();
  for (const row of viewsByDay) {
    const key = formatDay(row.lastAccessedAt);
    dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
  }
  const trend = lastDays(14).map((day) => ({
    key: day.key,
    label: day.label,
    count: dayMap.get(day.key) ?? 0,
  }));

  const engagement = alunosEngagement
    .filter((u) => u.progress.length > 0 || u.streakCount > 0)
    .map((u) => {
      const completed = u.progress.filter((p) => p.completed).length;
      const favorites = u.progress.filter((p) => p.favorite).length;
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        streakCount: u.streakCount,
        completed,
        favorites,
        totalProgress: u.progress.length,
        percentual: totalAulaCount
          ? Math.min(100, Math.round((completed / totalAulaCount) * 100))
          : 0,
        lastAccessAt: u.lastAccessAt,
      };
    })
    .sort((a, b) => b.completed - a.completed || b.percentual - a.percentual);

  return NextResponse.json({
    summary: {
      totalAulas,
      totalAlunos,
      totalViews: totalViews._sum.viewCount ?? 0,
      totalTemas: themes.length,
    },
    topVideos,
    viewsByTheme: perTheme,
    lastAccess,
    trend,
    engagement: engagement.slice(0, 12),
    engagementTotal: engagement.length,
  });
}