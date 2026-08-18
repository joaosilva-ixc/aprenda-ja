import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { extractDriveFileId } from "@/lib/drive";
import type { VideoStatus } from "@/generated/prisma/enums";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const themeId = String(body.themeId ?? "");
  const tagsRaw = String(body.tags ?? "");
  const driveLink = String(body.driveLink ?? "").trim();
  let driveFileId = String(body.driveFileId ?? "").trim();

  if (!title || !themeId) {
    return NextResponse.json({ error: "Título e tema são obrigatórios" }, { status: 400 });
  }
  if (!driveLink) {
    return NextResponse.json({ error: "O link da gravação é obrigatório" }, { status: 400 });
  }

  const theme = await prisma.theme.findUnique({ where: { id: themeId } });
  if (!theme) {
    return NextResponse.json({ error: "Tema não encontrado" }, { status: 400 });
  }

  if (!driveFileId) {
    driveFileId = extractDriveFileId(driveLink) ?? "";
  }

  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const aula = await prisma.aula.create({
    data: {
      title,
      description,
      themeId,
      videoPath: driveFileId || `drive-${randomUUID()}`,
      videoUrl: driveLink,
      driveFileId: driveFileId || null,
      driveLink,
      status: "READY" as VideoStatus,
      tags,
    },
  });

  return NextResponse.json({ aula }, { status: 201 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const themeId = searchParams.get("themeId") ?? undefined;

  const aulas = await prisma.aula.findMany({
    where: {
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