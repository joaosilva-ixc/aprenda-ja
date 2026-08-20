import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMaster, AuthError } from "@/lib/auth";
import { AnnouncementType } from "@/generated/prisma/enums";

export const runtime = "nodejs";

const VALID_TYPES: AnnouncementType[] = Object.values(AnnouncementType);

export async function GET() {
  try {
    await requireMaster();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  const announcements = await prisma.announcement.findMany({
    include: { _count: { select: { reads: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    announcements: announcements.map((a) => ({
      id: a.id,
      title: a.title,
      message: a.message,
      type: a.type,
      createdAt: a.createdAt,
      readCount: a._count.reads,
    })),
  });
}

export async function POST(request: Request) {
  try {
    await requireMaster();
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

  const message = String(body.message ?? "").trim();
  const title = body.title === undefined ? null : String(body.title ?? "").trim() || null;
  const type = VALID_TYPES.includes(body.type) ? body.type : "AVISO";

  if (!message) {
    return NextResponse.json(
      { error: "A mensagem do aviso é obrigatória" },
      { status: 400 },
    );
  }
  if (message.length > 1200) {
    return NextResponse.json(
      { error: "A mensagem do aviso deve ter no máximo 1200 caracteres" },
      { status: 400 },
    );
  }

  const announcement = await prisma.announcement.create({
    data: { title, message, type },
  });

  return NextResponse.json(
    { announcement: { id: announcement.id, title, message, type } },
    { status: 201 },
  );
}