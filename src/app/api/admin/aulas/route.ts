import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMaster, AuthError } from "@/lib/auth";
import { VideoStatus } from "@/generated/prisma/enums";

export const runtime = "nodejs";

const VALID_STATUSES: VideoStatus[] = Object.values(VideoStatus);

export async function GET(request: Request) {
  try {
    await requireMaster();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const themeId = searchParams.get("themeId") ?? "";

  const aulas = await prisma.aula.findMany({
    where: {
      ...(status && VALID_STATUSES.includes(status as VideoStatus)
        ? { status: status as VideoStatus }
        : {}),
      ...(themeId ? { themeId } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { tags: { has: q.toLowerCase() } },
            ],
          }
        : {}),
    },
    include: { theme: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ aulas });
}