import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { blobDeliveryResponse } from "@/lib/blob-delivery";
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
  const material = await prisma.aulaMaterial.findUnique({
    where: { id },
    select: { url: true, pathname: true },
  });
  if (!material?.url) {
    return NextResponse.json({ error: "Material não encontrado" }, { status: 404 });
  }

  return blobDeliveryResponse(material.url, material.pathname);
}
