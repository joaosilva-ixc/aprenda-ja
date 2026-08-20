import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  const [announcements, reads] = await Promise.all([
    prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.announcementRead.findMany({
      where: { userId: user.id },
      select: { announcementId: true },
    }),
  ]);

  const readSet = new Set(reads.map((r) => r.announcementId));

  const notifications = announcements.map((a) => ({
    id: a.id,
    title: a.title,
    message: a.message,
    type: a.type,
    createdAt: a.createdAt,
    read: readSet.has(a.id),
  }));

  return NextResponse.json({
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
  });
}