import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAdmin,
  hashPassword,
  generateTemporaryPassword,
  AuthError,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch (err) {
    return authError(err);
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  let actor;
  try {
    actor = await requireAdmin();
  } catch (err) {
    return authError(err);
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const requestedRole = String(body.role ?? "ALUNO");
  const isMaster = actor.role === "MASTER";
  const role =
    requestedRole === "MASTER" && isMaster
      ? "MASTER"
      : requestedRole === "ADMIN"
        ? "ADMIN"
        : "ALUNO";

  if (requestedRole === "MASTER" && !isMaster) {
    return NextResponse.json(
      { error: "Apenas o acesso master pode conceder o perfil master" },
      { status: 403 },
    );
  }

  if (!name || !email) {
    return NextResponse.json(
      { error: "Nome e e-mail são obrigatórios" },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Já existe um usuário com este e-mail" },
      { status: 409 },
    );
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role, mustChangePassword: true },
  });

  return NextResponse.json(
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      temporaryPassword,
    },
    { status: 201 },
  );
}

function authError(err: unknown) {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  return NextResponse.json({ error: "Erro interno" }, { status: 500 });
}