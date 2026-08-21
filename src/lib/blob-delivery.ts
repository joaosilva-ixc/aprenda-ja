import "server-only";
import { NextResponse } from "next/server";
import { issueSignedToken, presignUrl } from "@vercel/blob";

const PRESIGN_TTL_MS = 5 * 60_000;
const CACHE_SAFETY_MS = 30_000;

const PRIVATE_MARKER = ".private.blob.vercel-storage.com/";

const urlCache = new Map<string, { url: string; expiresAt: number }>();

export function isPrivateBlobUrl(url: string): boolean {
  return url.includes(PRIVATE_MARKER);
}

export function pathnameFromBlobUrl(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.slice(1));
  } catch {
    return "";
  }
}

export async function presignPrivateUrl(pathname: string): Promise<string> {
  const cached = urlCache.get(pathname);
  if (cached && cached.expiresAt > Date.now() + CACHE_SAFETY_MS) {
    return cached.url;
  }

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
  return presignedUrl;
}

export async function blobDeliveryResponse(
  url: string,
  pathname: string | null | undefined,
): Promise<NextResponse> {
  if (!isPrivateBlobUrl(url)) {
    return NextResponse.redirect(url, 302);
  }
  const effectivePathname = pathname ?? pathnameFromBlobUrl(url);
  if (!effectivePathname) {
    return NextResponse.json({ error: "Arquivo indisponível" }, { status: 404 });
  }
  try {
    const presigned = await presignPrivateUrl(effectivePathname);
    return NextResponse.redirect(presigned, 302);
  } catch (err) {
    console.error("Falha ao gerar URL assinada:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
