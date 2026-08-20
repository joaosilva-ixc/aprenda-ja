import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth";
import { recordStudyActivity } from "@/lib/progress";

export const runtime = "nodejs";

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

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const aulaId = String(body.aulaId ?? "").trim();
  if (!aulaId) {
    return NextResponse.json({ error: "aulaId é obrigatório" }, { status: 400 });
  }

  const aula = await prisma.aula.findUnique({ where: { id: aulaId } });
  if (!aula) {
    return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
  }

  const existing = await prisma.aulaProgress.findUnique({
    where: { userId_aulaId: { userId: user.id, aulaId } },
  });

  const completed =
    body.completed === undefined ? existing?.completed ?? false : Boolean(body.completed);
  const favorite =
    body.favorite === undefined ? existing?.favorite ?? false : Boolean(body.favorite);
  const positionSec =
    body.positionSec === undefined
      ? existing?.positionSec ?? 0
      : Math.max(0, Math.floor(Number(body.positionSec) || 0));

  const progress = await prisma.aulaProgress.upsert({
    where: { userId_aulaId: { userId: user.id, aulaId } },
    update: { completed, favorite, positionSec, lastAccessedAt: new Date() },
    create: { userId: user.id, aulaId, completed, favorite, positionSec },
  });

  if (completed) {
    await recordStudyActivity(user.id);
  }

  return NextResponse.json({ progress });
}