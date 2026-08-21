import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, hashPassword, AuthError } from "@/lib/auth";
import { updateUserSchema, parseBody } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let actor;
  try {
    actor = await requireAdmin();
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
  const parsed = parseBody(updateUserSchema, body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { name, email, role, password } = parsed.data;
  const isMaster = actor.role === "MASTER";

  if (role !== undefined && role !== "ALUNO" && !isMaster) {
    return NextResponse.json(
      { error: "Apenas o acesso master pode atribuir perfis de staff" },
      { status: 403 },
    );
  }

  if (email !== undefined) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== id) {
      return NextResponse.json(
        { error: "Já existe um usuário com este e-mail" },
        { status: 409 },
      );
    }
  }

  if (user.role === "MASTER" && !isMaster) {
    return NextResponse.json(
      { error: "Apenas o acesso master pode gerenciar contas master" },
      { status: 403 },
    );
  }

  if (id === actor.id && role !== undefined && role !== actor.role) {
    return NextResponse.json(
      { error: "Você não pode alterar o próprio perfil de acesso" },
      { status: 400 },
    );
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(password
        ? {
            passwordHash: await hashPassword(password),
            mustChangePassword: true,
            tokenVersion: { increment: 1 },
          }
        : {}),
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
  let actor;
  try {
    actor = await requireAdmin();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  const { id } = await params;
  if (id === actor.id) {
    return NextResponse.json(
      { error: "Não é possível excluir a própria conta" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  if (user.role === "MASTER") {
    return NextResponse.json(
      { error: "Não é possível excluir contas com acesso master" },
      { status: 400 },
    );
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}