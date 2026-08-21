import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth";
import { generateTotpSecret, otpauthUri } from "@/lib/totp";

export const runtime = "nodejs";

export async function POST() {
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
  if (user.totpEnabled) {
    return NextResponse.json(
      { error: "2FA já está ativo nesta conta" },
      { status: 400 },
    );
  }

  const secret = user.totpSecret ?? generateTotpSecret();
  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: secret },
  });

  return NextResponse.json({ secret, otpauthUri: otpauthUri(user.email, secret) });
}
