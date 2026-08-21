import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth";
import { updateProfileSchema, parseBody } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const parsed = parseBody(updateProfileSchema, body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { name, email } = parsed.data;

  if (email !== undefined) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== user.id) {
      return NextResponse.json(
        { error: "Já existe um usuário com este e-mail" },
        { status: 409 },
      );
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(email !== undefined ? { email } : {}),
    },
  });

  return NextResponse.json({
    user: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
    },
  });
}