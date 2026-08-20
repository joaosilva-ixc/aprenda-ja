import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthError, requireMaster } from "@/lib/auth";

export const runtime = "nodejs";

const ANNOUNCEMENT_KEY = "anuncio";

export async function GET() {
  try {
    await requireMaster();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  const setting = await prisma.setting.findUnique({
    where: { key: ANNOUNCEMENT_KEY },
  });

  return NextResponse.json({ announcement: setting?.value ?? "" });
}

export async function PATCH(request: Request) {
  try {
    await requireMaster();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.announcement !== "string") {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const announcement = body.announcement.trim();

  await prisma.setting.upsert({
    where: { key: ANNOUNCEMENT_KEY },
    update: { value: announcement || null },
    create: { key: ANNOUNCEMENT_KEY, value: announcement || null },
  });

  return NextResponse.json({ announcement });
}