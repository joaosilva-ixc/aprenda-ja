import { NextResponse } from "next/server";
import { handleUpload } from "@vercel/blob/client";
import { requireMaster, AuthError } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_SIZE = 1024 * 1024 * 1024; // 1GB
const ALLOWED_CONTENT_TYPES = ["video/*"];

export async function POST(request: Request) {
  let admin;
  try {
    admin = await requireMaster();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  if (!body || !body.type) {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_CONTENT_TYPES,
        maximumSizeInBytes: MAX_SIZE,
        addRandomSuffix: true,
        cacheControlMaxAge: 60 * 60 * 24 * 30,
        tokenPayload: JSON.stringify({ adminId: admin.id }),
      }),
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Falha ao gerar token de upload:", err);
    return NextResponse.json(
      { error: "Falha ao gerar o token de upload." },
      { status: 500 },
    );
  }
}