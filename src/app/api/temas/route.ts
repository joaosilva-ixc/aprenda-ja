import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const temas = await prisma.theme.findMany({
    include: { _count: { select: { aulas: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ temas });
}