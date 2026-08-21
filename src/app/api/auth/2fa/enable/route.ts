import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, createSession, AuthError } from "@/lib/auth";
import { verifyTotp, generateRecoveryCodes, sha256Hex } from "@/lib/totp";
import { parseBody } from "@/lib/validation";

export const runtime = "nodejs";

const enableSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Informe os 6 dígitos do código"),
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

  if (user.role === "ALUNO") {
    return NextResponse.json(
      { error: "2FA está disponível apenas para perfis de gestão" },
      { status: 403 },
    );
  }
  if (user.totpEnabled || !user.totpSecret) {
    return NextResponse.json(
      { error: "Inicie a configuração do 2FA primeiro" },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = parseBody(enableSchema, body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  if (!verifyTotp(user.totpSecret, parsed.data.code)) {
    return NextResponse.json({ error: "Código inválido. Tente novamente." }, { status: 400 });
  }

  const recoveryCodes = generateRecoveryCodes();
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      totpEnabled: true,
      recoveryCodes: recoveryCodes.map(sha256Hex),
    },
  });

  await createSession(updated);

  return NextResponse.json({ ok: true, recoveryCodes });
}
