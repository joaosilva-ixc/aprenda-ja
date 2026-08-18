import { NextResponse } from "next/server";
import { isDriveConfigured, listDriveSubfolders, listFolderFiles } from "@/lib/drive";

export const runtime = "nodejs";

export async function GET() {
  if (!isDriveConfigured()) {
    return NextResponse.json(
      { error: "Google Drive não configurado. Verifique GOOGLE_DRIVE_FOLDER_ID no .env" },
      { status: 503 },
    );
  }

  try {
    const folders = await listDriveSubfolders();
    const grouped = await Promise.all(
      folders.map(async (folder) => ({
        id: folder.id,
        name: folder.name,
        files: await listFolderFiles(folder.id),
      })),
    );
    return NextResponse.json({ folders: grouped });
  } catch (err) {
    console.error("Falha ao listar gravações do Google Drive:", err);
    return NextResponse.json(
      { error: "Falha ao consultar as gravações no Google Drive." },
      { status: 500 },
    );
  }
}