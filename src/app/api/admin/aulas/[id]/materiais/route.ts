import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireMaster, AuthError } from "@/lib/auth";
import { parseBody } from "@/lib/validation";

export const runtime = "nodejs";

const createMaterialSchema = z.object({
  title: z.string().trim().min(1, "Informe o título do material").max(200, "Título muito longo"),
  url: z.string().url("URL inválida").max(2048),
  pathname: z.string().trim().min(1).max(1024),
  sizeBytes: z.number().int().min(0).max(5 * 1024 * 1024 * 1024).optional(),
  contentType: z.string().trim().max(120).optional(),
});

export async function POST(
  request: Request,
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
  const aula = await prisma.aula.findUnique({ where: { id }, select: { id: true } });
  if (!aula) {
    return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = parseBody(createMaterialSchema, body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const material = await prisma.aulaMaterial.create({
    data: { aulaId: id, ...parsed.data },
  });

  return NextResponse.json(
    {
      material: {
        id: material.id,
        title: material.title,
        sizeBytes: material.sizeBytes,
        createdAt: material.createdAt,
      },
    },
    { status: 201 },
  );
}
