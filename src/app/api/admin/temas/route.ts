import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthError, requireMaster } from "@/lib/auth";
import { createThemeSchema, parseBody } from "@/lib/validation";

export const runtime = "nodejs";

function slugify(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

export async function GET() {
  try {
    await requireMaster();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  const temas = await prisma.theme.findMany({
    include: { _count: { select: { aulas: true } } },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ temas });
}

export async function POST(request: Request) {
  try {
    await requireMaster();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const parsed = parseBody(createThemeSchema, body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { name, color, icon } = parsed.data;

  const slug = slugify(name);
  if (!slug) {
    return NextResponse.json({ error: "Nome do tema inválido" }, { status: 400 });
  }

  const exists = await prisma.theme.findUnique({ where: { slug } });
  if (exists) {
    return NextResponse.json(
      { error: "Já existe um tema com este nome" },
      { status: 409 },
    );
  }

  const last = await prisma.theme.aggregate({ _max: { order: true } });
  const order = (last._max.order ?? 0) + 1;

  const tema = await prisma.theme.create({
    data: { name, slug, color, icon, order },
  });

  return NextResponse.json({ tema }, { status: 201 });
}