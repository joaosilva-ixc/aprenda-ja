import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireUser();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  const { id } = await params;
  const aula = await prisma.aula.findUnique({
    where: { id },
    select: { captionsVtt: true },
  });
  if (!aula?.captionsVtt) {
    return NextResponse.json({ error: "Legendas não encontradas" }, { status: 404 });
  }

  return new NextResponse(aula.captionsVtt, {
    headers: {
      "Content-Type": "text/vtt; charset=utf-8",
      "Cache-Control": "private, max-age=300",
    },
  });
}
