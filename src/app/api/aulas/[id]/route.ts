import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMaster, AuthError } from "@/lib/auth";
import { deleteBlob } from "@/lib/storage";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireMaster();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  const { id } = await params;

  const aula = await prisma.aula.findUnique({ where: { id } });
  if (!aula) {
    return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
  }

  await deleteBlob(aula.blobPathname);
  await prisma.aula.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}