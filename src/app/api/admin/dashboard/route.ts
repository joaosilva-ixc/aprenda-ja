import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  const [themes, topVideos, byTheme, lastAccess, totalAulas, totalAlunos, totalViews] =
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
      prisma.user.count({ where: { role: "ALUNO" } }),
      prisma.aula.aggregate({ _sum: { viewCount: true } }),
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
  });
}
