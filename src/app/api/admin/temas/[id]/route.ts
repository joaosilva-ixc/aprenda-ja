import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthError, requireMaster } from "@/lib/auth";
import { updateThemeSchema, parseBody } from "@/lib/validation";

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
  const tema = await prisma.theme.findUnique({ where: { id } });
  if (!tema) {
    return NextResponse.json({ error: "Tema não encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = parseBody(updateThemeSchema, body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { name, color, icon } = parsed.data;

  const updated = await prisma.theme.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(color !== undefined ? { color } : {}),
      ...(icon !== undefined ? { icon } : {}),
    },
  });

  return NextResponse.json({ tema: updated });
}

export async function DELETE(
  _request: Request,
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
  const tema = await prisma.theme.findUnique({
    where: { id },
    include: { _count: { select: { aulas: true } } },
  });
  if (!tema) {
    return NextResponse.json({ error: "Tema não encontrado" }, { status: 404 });
  }
  if (tema._count.aulas > 0) {
    return NextResponse.json(
      { error: `Não é possível excluir: existem ${tema._count.aulas} aula(s) neste tema.` },
      { status: 400 },
    );
  }

  await prisma.theme.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}