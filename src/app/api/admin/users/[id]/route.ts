import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, hashPassword, AuthError } from "@/lib/auth";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const name = body.name === undefined ? undefined : String(body.name ?? "").trim();
  const email =
    body.email === undefined
      ? undefined
      : String(body.email ?? "").trim().toLowerCase();
  const role =
    String(body.role ?? "") === "ADMIN" || String(body.role ?? "") === "ALUNO"
      ? (String(body.role) as "ADMIN" | "ALUNO")
      : undefined;
  const password = body.password === undefined ? undefined : String(body.password ?? "");

  if (name !== undefined && !name) {
    return NextResponse.json({ error: "O nome não pode ficar vazio" }, { status: 400 });
  }

  if (email !== undefined) {
    if (!email) {
      return NextResponse.json(
        { error: "O e-mail não pode ficar vazio" },
        { status: 400 },
      );
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== id) {
      return NextResponse.json(
        { error: "Já existe um usuário com este e-mail" },
        { status: 409 },
      );
    }
  }

  if (password !== undefined && password && password.length < 6) {
    return NextResponse.json(
      { error: "A senha deve ter pelo menos 6 caracteres" },
      { status: 400 },
    );
  }

  if (role === "ALUNO" && id === admin.id) {
    return NextResponse.json(
      { error: "Você não pode remover o próprio perfil de administrador" },
      { status: 400 },
    );
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(password ? { passwordHash: await hashPassword(password) } : {}),
    },
  });

  return NextResponse.json({
    user: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      createdAt: updated.createdAt,
    },
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  const { id } = await params;
  if (id === admin.id) {
    return NextResponse.json(
      { error: "Não é possível excluir a própria conta" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}