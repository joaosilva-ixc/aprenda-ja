import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMaster, AuthError } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let actor;
  try {
    actor = await requireMaster();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  const { id } = await params;
  if (id === actor.id) {
    return NextResponse.json(
      { error: "Use a tela de Segurança para alterar o seu próprio 2FA" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }
  if (user.role === "ALUNO") {
    return NextResponse.json(
      { error: "Usuários do tipo aluno não possuem 2FA" },
      { status: 400 },
    );
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      totpEnabled: false,
      totpSecret: null,
      recoveryCodes: [],
      tokenVersion: { increment: 1 },
    },
  });

  return NextResponse.json({
    ok: true,
    user: { id: updated.id, name: updated.name },
  });
}
