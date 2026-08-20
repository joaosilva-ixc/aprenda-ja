import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthError, requireMaster } from "@/lib/auth";

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
    orderBy: { name: "asc" },
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
  if (!body) {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const color = String(body.color ?? "").trim() || "#2563eb";
  const icon = String(body.icon ?? "").trim() || "book-open";

  if (!name) {
    return NextResponse.json({ error: "O nome do tema é obrigatório" }, { status: 400 });
  }

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

  const tema = await prisma.theme.create({
    data: { name, slug, color, icon },
  });

  return NextResponse.json({ tema }, { status: 201 });
}