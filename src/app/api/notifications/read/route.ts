import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth";

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

  if (body?.all === true) {
    const unread = await prisma.announcementRead.findMany({
      where: { userId: user.id },
      select: { announcementId: true },
    });
    const readMap = new Set(unread.map((u) => u.announcementId));
    const pending = await prisma.announcement.findMany({
      where: { id: { notIn: Array.from(readMap) } },
      select: { id: true },
    });
    if (pending.length > 0) {
      await prisma.announcementRead.createMany({
        data: pending.map((a) => ({ userId: user.id, announcementId: a.id })),
        skipDuplicates: true,
      });
    }
    return NextResponse.json({ ok: true });
  }

  const id = String(body?.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "Nenhum aviso informado" }, { status: 400 });
  }

  const announcement = await prisma.announcement.findUnique({ where: { id } });
  if (!announcement) {
    return NextResponse.json({ error: "Aviso não encontrado" }, { status: 404 });
  }

  await prisma.announcementRead.upsert({
    where: { userId_announcementId: { userId: user.id, announcementId: id } },
    update: {},
    create: { userId: user.id, announcementId: id },
  });

  return NextResponse.json({ ok: true });
}