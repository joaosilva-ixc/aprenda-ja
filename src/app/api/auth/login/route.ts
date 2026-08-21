import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession } from "@/lib/auth";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { loginSchema, parseBody } from "@/lib/validation";

export const runtime = "nodejs";

const DUMMY_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEe.WvJ8sJcVLGVGGRIvbTQ0zJBpVMHqQ4y";

export async function POST(request: Request) {
  const ip = getClientIp(request);

  const ipLimit = await rateLimit(`login:ip:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente mais tarde." },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSec) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = parseBody(loginSchema, body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const emailLimit = await rateLimit(`login:email:${email}`, {
    limit: 5,
    windowMs: 5 * 60_000,
  });
  if (!emailLimit.ok) {
    return NextResponse.json(
      { error: "Muitas tentativas para esta conta. Aguarde alguns minutos." },
      { status: 429, headers: { "Retry-After": String(emailLimit.retryAfterSec) } },
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordOk = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !passwordOk) {
    return NextResponse.json(
      { error: "E-mail ou senha inválidos" },
      { status: 401 },
    );
  }

  await createSession(user);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastAccessAt: new Date() },
  });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
  });
}
