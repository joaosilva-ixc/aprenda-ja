import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";

export const runtime = "nodejs";

function esc(value: string | number | null | undefined) {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function headerRow(cols: string[]) {
  return cols.map((c) => esc(c)).join(",") + "\n";
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AuthError) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: err.status,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "Erro interno" }), { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "";

  let filename = "relatorio.csv";
  let csv = "";

  if (type === "aulas") {
    filename = "aulas.csv";
    const aulas = await prisma.aula.findMany({
      include: { theme: true },
      orderBy: { createdAt: "desc" },
    });
    csv += headerRow(["Título", "Descrição", "Tema", "Tags", "Status", "Visualizações", "Criado em"]);
    for (const a of aulas) {
      csv += [
        esc(a.title),
        esc(a.description),
        esc(a.theme.name),
        esc(a.tags.join(", ")),
        esc(a.status),
        esc(a.viewCount),
        esc(new Date(a.createdAt).toLocaleString("pt-BR")),
      ].join(",") + "\n";
    }
  } else if (type === "alunos") {
    filename = "alunos.csv";
    const users = await prisma.user.findMany({
      where: { role: "ALUNO" },
      select: {
        name: true,
        email: true,
        streakCount: true,
        lastAccessAt: true,
        createdAt: true,
        progress: { select: { completed: true, favorite: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    const totalAulas = await prisma.aula.count();
    csv += headerRow(["Nome", "E-mail", "Streak", "Aulas concluídas", "Favoritos", "Dias desde o cadastro", "Último acesso"]);
    for (const u of users) {
      const completed = u.progress.filter((p) => p.completed).length;
      const favorites = u.progress.filter((p) => p.favorite).length;
      const days = Math.max(
        0,
        Math.round((Date.now() - new Date(u.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
      );
      csv += [
        esc(u.name),
        esc(u.email),
        esc(u.streakCount),
        esc(completed),
        esc(favorites),
        esc(days),
        esc(u.lastAccessAt ? new Date(u.lastAccessAt).toLocaleString("pt-BR") : ""),
      ].join(",") + "\n";
    }
    void totalAulas;
  } else if (type === "progresso") {
    filename = "progresso.csv";
    const progress = await prisma.aulaProgress.findMany({
      include: { user: true, aula: { include: { theme: true } } },
      orderBy: [{ user: { name: "asc" } }, { lastAccessedAt: "desc" }],
    });
    csv += headerRow(["Aluno", "E-mail", "Aula", "Tema", "Concluída", "Favorita", "Último acesso"]);
    for (const p of progress) {
      csv += [
        esc(p.user.name),
        esc(p.user.email),
        esc(p.aula.title),
        esc(p.aula.theme.name),
        esc(p.completed ? "Sim" : "Não"),
        esc(p.favorite ? "Sim" : "Não"),
        esc(new Date(p.lastAccessedAt).toLocaleString("pt-BR")),
      ].join(",") + "\n";
    }
  } else {
    return new Response(JSON.stringify({ error: "Tipo de exportação inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}