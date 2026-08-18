import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, verifyPassword, hashPassword, AuthError } from "@/lib/auth";

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
  if (!body) {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Informe a senha atual e a nova senha" },
      { status: 400 },
    );
  }
  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "A nova senha deve ter pelo menos 6 caracteres" },
      { status: 400 },
    );
  }

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    return NextResponse.json(
      { error: "Senha atual incorreta" },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword), mustChangePassword: false },
  });

  return NextResponse.json({ ok: true });
}
