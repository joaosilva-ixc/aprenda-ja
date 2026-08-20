import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthError, requireMaster } from "@/lib/auth";

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
  if (!body) {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const name = body.name === undefined ? undefined : String(body.name ?? "").trim();
  const color = body.color === undefined ? undefined : String(body.color ?? "").trim();
  const icon = body.icon === undefined ? undefined : String(body.icon ?? "").trim();

  if (name !== undefined && !name) {
    return NextResponse.json({ error: "O nome do tema não pode ficar vazio" }, { status: 400 });
  }
  if (color !== undefined && !color) {
    return NextResponse.json({ error: "A cor do tema não pode ficar vazia" }, { status: 400 });
  }

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