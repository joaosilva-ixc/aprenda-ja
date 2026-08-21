import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  requireUser,
  verifyPassword,
  createSession,
  AuthError,
} from "@/lib/auth";
import { parseBody } from "@/lib/validation";

export const runtime = "nodejs";

const disableSchema = z.object({
  password: z.string().min(1, "Informe sua senha para confirmar").max(128),
});

export async function POST(request: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  if (!user.totpEnabled) {
    return NextResponse.json({ error: "2FA não está ativo" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = parseBody(disableSchema, body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabled: false, totpSecret: null, recoveryCodes: [] },
  });

  await createSession(updated);

  return NextResponse.json({ ok: true });
}
