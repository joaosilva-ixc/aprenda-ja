import { NextResponse } from "next/server";
import { issueSignedToken, presignUrl } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth";

export const runtime = "nodejs";

const PRESIGN_TTL_MS = 5 * 60_000;
const CACHE_SAFETY_MS = 30_000;

const PRIVATE_MARKER = ".private.blob.vercel-storage.com/";

const urlCache = new Map<string, { url: string; expiresAt: number }>();

function pathnameFromUrl(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.slice(1));
  } catch {
    return "";
  }
}

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
    select: { videoUrl: true, blobPathname: true },
  });
  if (!aula?.videoUrl) {
    return NextResponse.json({ error: "Vídeo não encontrado" }, { status: 404 });
  }

  if (!aula.videoUrl.includes(PRIVATE_MARKER)) {
    return NextResponse.redirect(aula.videoUrl, 302);
  }

  const pathname = aula.blobPathname ?? pathnameFromUrl(aula.videoUrl);
  if (!pathname) {
    return NextResponse.json({ error: "Vídeo indisponível" }, { status: 404 });
  }

  const cached = urlCache.get(pathname);
  if (cached && cached.expiresAt > Date.now() + CACHE_SAFETY_MS) {
    return NextResponse.redirect(cached.url, 302);
  }

  try {
    const validUntil = Date.now() + PRESIGN_TTL_MS;
    const signedToken = await issueSignedToken({
      pathname,
      operations: ["get"],
      validUntil,
    });
    const { presignedUrl } = await presignUrl(signedToken, {
      operation: "get",
      access: "private",
      pathname,
      validUntil,
    });
    urlCache.set(pathname, { url: presignedUrl, expiresAt: validUntil });
    return NextResponse.redirect(presignedUrl, 302);
  } catch (err) {
    console.error("Falha ao gerar URL assinada do vídeo:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
