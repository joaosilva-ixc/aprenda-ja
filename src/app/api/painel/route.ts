import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  const [aulas, progressList, userFull] = await Promise.all([
    prisma.aula.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        viewCount: true,
        theme: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.aulaProgress.findMany({
      where: { userId: user.id },
      select: { aulaId: true, completed: true, favorite: true, lastAccessedAt: true },
      orderBy: { lastAccessedAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true, createdAt: true, streakCount: true, lastStudyDate: true },
    }),
  ]);

  const aulaMap = new Map(aulas.map((a) => [a.id, a]));
  const progMap = new Map(progressList.map((p) => [p.aulaId, p]));

  const themes: {
    id: string;
    name: string;
    color: string;
    total: number;
    completed: number;
    percentual: number;
    concluido: boolean;
  }[] = [];
  const themeIndex = new Map<string, number>();

  for (const a of aulas) {
    let entry = themeIndex.get(a.theme.id);
    if (entry === undefined) {
      themes.push({
        id: a.theme.id,
        name: a.theme.name,
        color: a.theme.color,
        total: 0,
        completed: 0,
        percentual: 0,
        concluido: false,
      });
      entry = themes.length - 1;
      themeIndex.set(a.theme.id, entry);
    }
    themes[entry].total += 1;
    if (progMap.get(a.id)?.completed) themes[entry].completed += 1;
  }

  for (const t of themes) {
    t.percentual = t.total ? Math.round((t.completed / t.total) * 100) : 0;
    t.concluido = t.total > 0 && t.completed === t.total;
  }

  const totalAulas = aulas.length;
  const totalAssistidas = progressList.filter((p) => p.completed).length;
  const continues = progressList.find((p) => !p.completed && aulaMap.has(p.aulaId));

  const toCard = (p: { aulaId: string; lastAccessedAt: Date }) => {
    const a = aulaMap.get(p.aulaId);
    if (!a) return null;
    return {
      id: a.id,
      title: a.title,
      viewCount: a.viewCount,
      theme: { name: a.theme.name, color: a.theme.color },
      lastAccessedAt: p.lastAccessedAt,
    };
  };

  return NextResponse.json({
    user: {
      id: userFull?.id,
      name: userFull?.name,
      email: userFull?.email,
      createdAt: userFull?.createdAt,
      streakCount: userFull?.streakCount ?? 0,
      lastStudyDate: userFull?.lastStudyDate,
    },
    stats: {
      totalAulas,
      totalAssistidas,
      percentual: totalAulas ? Math.round((totalAssistidas / totalAulas) * 100) : 0,
    },
    themes,
    continueWatching: continues ? toCard(continues) : null,
    recent: progressList.slice(0, 6).map(toCard).filter(Boolean),
    favorites: progressList
      .filter((p) => p.favorite && aulaMap.has(p.aulaId))
      .slice(0, 8)
      .map(toCard)
      .filter(Boolean),
  });
}