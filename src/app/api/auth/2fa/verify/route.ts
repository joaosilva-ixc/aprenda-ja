import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  consumeTwoFactorChallenge,
  clearTwoFactorChallenge,
  createSession,
} from "@/lib/auth";
import { verifyTotp, sha256Hex, safeEqual } from "@/lib/totp";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { parseBody } from "@/lib/validation";

export const runtime = "nodejs";

const verifySchema = z.object({
  code: z.string().trim().min(6, "Informe o código").max(10, "Código inválido"),
});

export async function POST(request: Request) {
  const limit = await rateLimit(`2fa:${getClientIp(request)}`, {
    limit: 5,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente mais tarde." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const userId = await consumeTwoFactorChallenge();
  if (!userId) {
    return NextResponse.json(
      { error: "Sessão de verificação expirada. Faça login novamente." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = parseBody(verifySchema, body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.totpEnabled || !user.totpSecret) {
    return NextResponse.json(
      { error: "Sessão de verificação inválida." },
      { status: 401 },
    );
  }

  const code = parsed.data.code.toUpperCase();
  let verified = verifyTotp(user.totpSecret, code);

  if (!verified && /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
    const hash = sha256Hex(code);
    if (user.recoveryCodes.some((stored) => safeEqual(stored, hash))) {
      verified = true;
      await prisma.user.update({
        where: { id: user.id },
        data: { recoveryCodes: user.recoveryCodes.filter((c) => c !== hash) },
      });
    }
  }

  if (!verified) {
    return NextResponse.json({ error: "Código inválido" }, { status: 401 });
  }

  await clearTwoFactorChallenge();
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
