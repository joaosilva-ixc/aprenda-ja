import "server-only";
import { prisma } from "@/lib/prisma";

function startOfDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function recordStudyActivity(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streakCount: true, lastStudyDate: true },
  });
  if (!user) return 0;

  const today = startOfDay(new Date());
  const last = user.lastStudyDate ? startOfDay(user.lastStudyDate) : null;

  if (!last || last.getTime() < today.getTime()) {
    const diffDays = last
      ? Math.round((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
      : NaN;
    const streak = last && diffDays === 1 ? user.streakCount + 1 : 1;
    await prisma.user.update({
      where: { id: userId },
      data: { streakCount: streak, lastStudyDate: new Date() },
    });
    return streak;
  }

  return user.streakCount;
}