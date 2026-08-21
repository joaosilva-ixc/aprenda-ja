import "dotenv/config";
import { copy, del } from "@vercel/blob";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PRIVATE_MARKER = ".private.blob.vercel-storage.com/";

function pathnameFromUrl(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.slice(1));
  } catch {
    return "";
  }
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN não definido no .env");
  }

  const aulas = await prisma.aula.findMany({
    where: { videoUrl: { not: "" } },
    select: { id: true, title: true, videoUrl: true, blobPathname: true },
    orderBy: { createdAt: "asc" },
  });

  const pending = aulas.filter((a) => !a.videoUrl.includes(PRIVATE_MARKER));
  console.log(`Vídeos públicos a migrar: ${pending.length} de ${aulas.length}`);
  if (pending.length === 0) return;

  let ok = 0;
  let fail = 0;

  for (const aula of pending) {
    console.log(`\n[${ok + fail + 1}/${pending.length}] ${aula.title}`);

    const sourcePathname = aula.blobPathname ?? pathnameFromUrl(aula.videoUrl);
    const filename = sourcePathname.split("/").pop() ?? `${aula.id}.mp4`;
    const targetPathname = `privado/${filename}`;

    try {
      const copied = await copy(aula.videoUrl, targetPathname, {
        access: "private",
        addRandomSuffix: false,
      });
      await del(aula.videoUrl);
      await prisma.aula.update({
        where: { id: aula.id },
        data: {
          videoUrl: copied.url,
          blobPathname: copied.pathname,
        },
      });
      ok++;
      console.log(`  OK → ${copied.pathname}`);
    } catch (err) {
      fail++;
      console.error(
        "  falha:",
        err instanceof Error ? err.message.split("\n")[0] : err,
      );
    }
  }

  console.log(`\nConcluído: ${ok} migrado(s), ${fail} falha(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
