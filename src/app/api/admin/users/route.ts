import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAdmin,
  hashPassword,
  generateTemporaryPassword,
  AuthError,
} from "@/lib/auth";
import { createUserSchema, parseBody } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  let actor;
  try {
    actor = await requireAdmin();
  } catch (err) {
    return authError(err);
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  const users = await prisma.user.findMany({
    where: {
      ...(actor.role === "MASTER" ? {} : { role: { not: "MASTER" } }),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
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
  const parsed = parseBody(createUserSchema, body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { name, email } = parsed.data;
  const requestedRole = parsed.data.role;
  const isMaster = actor.role === "MASTER";

  let role: "MASTER" | "ADMIN" | "ALUNO" = "ALUNO";
  if (requestedRole !== "ALUNO") {
    if (!isMaster) {
      return NextResponse.json(
        { error: "Apenas o acesso master pode criar contas de staff" },
        { status: 403 },
      );
    }
    role = requestedRole;
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