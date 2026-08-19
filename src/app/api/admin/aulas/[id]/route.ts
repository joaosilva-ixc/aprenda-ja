import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";
import { VideoStatus } from "@/generated/prisma/enums";

export const runtime = "nodejs";

const VALID_STATUSES: VideoStatus[] = Object.values(VideoStatus);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  const { id } = await params;
  const aula = await prisma.aula.findUnique({ where: { id } });
  if (!aula) {
    return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const title = body.title === undefined ? undefined : String(body.title ?? "").trim();
  const description =
    body.description === undefined ? undefined : String(body.description ?? "").trim();
  const themeId = body.themeId === undefined ? undefined : String(body.themeId ?? "");
  const tagsRaw = body.tags === undefined ? undefined : String(body.tags ?? "");
  const status = body.status === undefined ? undefined : String(body.status ?? "");

  if (title !== undefined && !title) {
    return NextResponse.json({ error: "O título não pode ficar vazio" }, { status: 400 });
  }

  if (themeId !== undefined) {
    const theme = await prisma.theme.findUnique({ where: { id: themeId } });
    if (!theme) {
      return NextResponse.json({ error: "Tema não encontrado" }, { status: 400 });
    }
  }

  if (status !== undefined && !VALID_STATUSES.includes(status as VideoStatus)) {
    return NextResponse.json(
      { error: "Status inválido" },
      { status: 400 },
    );
  }

  const tags =
    tagsRaw === undefined
      ? undefined
      : tagsRaw
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);

  const data: Prisma.AulaUncheckedUpdateInput = {
    ...(title !== undefined ? { title } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(themeId !== undefined ? { themeId } : {}),
    ...(tags !== undefined ? { tags } : {}),
    ...(status !== undefined ? { status: status as VideoStatus } : {}),
  };

  const updated = await prisma.aula.update({
    where: { id },
    data,
    include: { theme: true },
  });

  return NextResponse.json({ aula: updated });
}