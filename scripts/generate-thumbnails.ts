import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import { mkdir, readFile, rm } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { put } from "@vercel/blob";

const require = createRequire(import.meta.url);
const execFileAsync = promisify(execFile);

const ffmpegPath = require("ffmpeg-static") as string;
const ffprobePath = (require("ffprobe-static") as { path: string }).path;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const TMP_DIR = "/tmp/opencode/thumbs";

async function getDurationSec(url: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync(ffprobePath, [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "csv=p=0",
      url,
    ]);
    const d = Number(stdout.trim());
    return Number.isFinite(d) && d > 0 ? d : null;
  } catch {
    return null;
  }
}

async function downloadVideo(url: string, outPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`download falhou: HTTP ${res.status}`);
  }
  const { writeFile } = await import("node:fs/promises");
  const chunks: Buffer[] = [];
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(Buffer.from(value));
  }
  await writeFile(outPath, Buffer.concat(chunks));
}

async function extractFrame(sourcePath: string, outPath: string): Promise<boolean> {
  const duration = await getDurationSec(sourcePath);
  const seekAt = duration ? Math.max(0.1, Math.min(duration * 0.1, 3)) : 1;
  try {
    await execFileAsync(ffmpegPath, [
      "-y",
      "-ss", String(seekAt),
      "-i", sourcePath,
      "-frames:v", "1",
      "-vf", "scale=640:-2",
      "-q:v", "3",
      outPath,
    ]);
    return true;
  } catch (err) {
    console.error(`  falha no ffmpeg:`, err instanceof Error ? err.message.split("\n")[0] : err);
    return false;
  }
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN não definido no .env");
  }

  const aulas = await prisma.aula.findMany({
    where: { thumbnailUrl: null, videoUrl: { not: "" } },
    select: { id: true, title: true, videoUrl: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Aulas sem thumbnail: ${aulas.length}`);
  if (aulas.length === 0) return;

  await mkdir(TMP_DIR, { recursive: true });

  let ok = 0;
  let fail = 0;

  for (const aula of aulas) {
    console.log(`\n[${ok + fail + 1}/${aulas.length}] ${aula.title}`);
    const videoPath = `${TMP_DIR}/${aula.id}.mp4`;
    const outPath = `${TMP_DIR}/${aula.id}.jpg`;

    try {
      console.log("  baixando vídeo…");
      await downloadVideo(aula.videoUrl, videoPath);
    } catch (err) {
      console.error("  falha no download:", err instanceof Error ? err.message : err);
      fail++;
      continue;
    }

    if (!(await extractFrame(videoPath, outPath))) {
      await rm(videoPath, { force: true });
      fail++;
      continue;
    }
    await rm(videoPath, { force: true });

    let buffer: Buffer;
    try {
      buffer = await readFile(outPath);
    } catch {
      console.error("  falha ao ler o frame gerado");
      fail++;
      continue;
    }
    await rm(outPath, { force: true });

    if (buffer.length < 1024) {
      console.error("  frame inválido (muito pequeno)");
      fail++;
      continue;
    }

    try {
      const blob = await put(`thumbnails/${aula.id}.jpg`, buffer, {
        access: "public",
        contentType: "image/jpeg",
        addRandomSuffix: true,
        allowOverwrite: false,
      });
      await prisma.aula.update({
        where: { id: aula.id },
        data: { thumbnailUrl: blob.url },
      });
      ok++;
      console.log(`  OK (${Math.round(buffer.length / 1024)} KB)`);
    } catch (err) {
      console.error("  falha no upload:", err instanceof Error ? err.message : err);
      fail++;
    }
  }

  console.log(`\nConcluído: ${ok} gerada(s), ${fail} falha(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
