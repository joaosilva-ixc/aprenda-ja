import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMaster, AuthError } from "@/lib/auth";
import { updateAulaSchema, parseBody } from "@/lib/validation";
import { Prisma } from "@/generated/prisma/client";
import { VideoStatus } from "@/generated/prisma/enums";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireMaster();
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
  const parsed = parseBody(updateAulaSchema, body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { title, description, themeId, tags: tagsRaw, status } = parsed.data;

  if (themeId !== undefined) {
    const theme = await prisma.theme.findUnique({ where: { id: themeId } });
    if (!theme) {
      return NextResponse.json({ error: "Tema não encontrado" }, { status: 400 });
    }
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