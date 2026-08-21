import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireUser,
  verifyPassword,
  hashPassword,
  createSession,
  AuthError,
} from "@/lib/auth";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { changePasswordSchema, parseBody } from "@/lib/validation";

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

  const ipLimit = await rateLimit(`password:${getClientIp(request)}`, {
    limit: 5,
    windowMs: 60_000,
  });
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente mais tarde." },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSec) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = parseBody(changePasswordSchema, body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return NextResponse.json(
      { error: "Senha atual incorreta" },
      { status: 400 },
    );
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(parsed.data.newPassword),
      mustChangePassword: false,
      tokenVersion: { increment: 1 },
    },
  });

  await createSession(updated);

  return NextResponse.json({ ok: true });
}
