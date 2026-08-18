import { google } from "googleapis";

const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY;
const driveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

let drive: ReturnType<typeof google.drive> | null = null;

export function isDriveConfigured() {
  return Boolean(clientEmail && privateKey && driveFolderId);
}

export function getDriveFolderId() {
  return driveFolderId;
}

export function getDrive() {
  if (!isDriveConfigured()) {
    throw new Error(
      "Google Drive não configurado. Defina GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY e GOOGLE_DRIVE_FOLDER_ID no .env",
    );
  }
  if (!drive) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });
    drive = google.drive({ version: "v3", auth });
  }
  return drive;
}

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string | null;
  webViewLink: string | null;
  size?: string | null;
  modifiedTime?: string | null;
};

export type DriveFolder = {
  id: string;
  name: string;
};

export async function listDriveSubfolders(): Promise<DriveFolder[]> {
  const d = getDrive();
  const res = await d.files.list({
    q: `'${driveFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed = false`,
    orderBy: "name",
    fields: "files(id,name)",
    pageSize: 100,
  });
  return (res.data.files ?? []) as DriveFolder[];
}

export async function listFolderFiles(folderId: string): Promise<DriveFile[]> {
  const d = getDrive();
  const res = await d.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    orderBy: "modifiedTime desc",
    fields: "files(id,name,mimeType,webViewLink,size,modifiedTime)",
    pageSize: 1000,
  });
  return (res.data.files ?? []) as DriveFile[];
}

export function extractDriveFileId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) ?? url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}