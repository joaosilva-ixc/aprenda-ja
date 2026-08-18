import { del } from "@vercel/blob";

export async function deleteBlob(pathname: string | null) {
  if (!pathname) return;
  try {
    await del(pathname);
  } catch (err) {
    console.error("Falha ao excluir blob do Vercel Blob:", err);
  }
}