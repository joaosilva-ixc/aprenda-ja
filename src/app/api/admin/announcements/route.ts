import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMaster, AuthError } from "@/lib/auth";
import { createAnnouncementSchema, parseBody } from "@/lib/validation";
import { AnnouncementType } from "@/generated/prisma/enums";

export const runtime = "nodejs";

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
  const parsed = parseBody(createAnnouncementSchema, body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { message } = parsed.data;
  const title = parsed.data.title || null;
  const type = parsed.data.type as AnnouncementType;

  const announcement = await prisma.announcement.create({
    data: { title, message, type },
  });

  return NextResponse.json(
    { announcement: { id: announcement.id, title, message, type } },
    { status: 201 },
  );
}