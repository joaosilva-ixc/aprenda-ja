import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const temas = await prisma.theme.findMany({
    include: { _count: { select: { aulas: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ temas });
}
