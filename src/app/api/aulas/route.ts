import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getSessionUser, AuthError } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const themeId = String(body.themeId ?? "");
  const tagsRaw = String(body.tags ?? "");
  const videoUrl = String(body.videoUrl ?? "").trim();
  const blobPathname = String(body.blobPathname ?? "").trim() || null;

  if (!title || !themeId) {
    return NextResponse.json({ error: "Título e tema são obrigatórios" }, { status: 400 });
  }
  if (!videoUrl) {
    return NextResponse.json({ error: "É necessário enviar o vídeo" }, { status: 400 });
  }

  const theme = await prisma.theme.findUnique({ where: { id: themeId } });
  if (!theme) {
    return NextResponse.json({ error: "Tema não encontrado" }, { status: 400 });
  }

  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const aula = await prisma.aula.create({
    data: {
      title,
      description,
      themeId,
      videoUrl,
      blobPathname,
      status: "READY",
      tags,
    },
  });

  return NextResponse.json({ aula }, { status: 201 });
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const themeId = searchParams.get("themeId") ?? undefined;

  const aulas = await prisma.aula.findMany({
    where: {
      ...(themeId ? { themeId } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { tags: { has: q.toLowerCase() } },
            ],
          }
        : {}),
    },
    include: { theme: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ aulas });
}