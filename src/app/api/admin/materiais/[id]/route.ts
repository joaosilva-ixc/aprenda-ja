import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { requireMaster, AuthError } from "@/lib/auth";

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
  const material = await prisma.aulaMaterial.findUnique({ where: { id } });
  if (!material) {
    return NextResponse.json({ error: "Material não encontrado" }, { status: 404 });
  }

  try {
    await del(material.url);
  } catch (err) {
    console.error("Falha ao remover blob do material:", err);
  }
  await prisma.aulaMaterial.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
