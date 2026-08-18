import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { ThemeSlug } from "../src/generated/prisma/enums";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const temas: { slug: ThemeSlug; name: string; icon: string; color: string }[] = [
    {
      slug: "CONFIGURACAO_GERAL",
      name: "Configuração Geral",
      icon: "settings",
      color: "#3b82f6",
    },
    {
      slug: "USABILIDADE",
      name: "Usabilidade",
      icon: "mouse-pointer-click",
      color: "#8b5cf6",
    },
    {
      slug: "PABX",
      name: "PABX",
      icon: "phone",
      color: "#10b981",
    },
    {
      slug: "FLUXO_COMUNICACAO",
      name: "Fluxo de Comunicação",
      icon: "network",
      color: "#f59e0b",
    },
  ];

  for (const t of temas) {
    await prisma.theme.upsert({
      where: { slug: t.slug },
      update: t,
      create: t,
    });
  }

  console.log("Temas criados:", await prisma.theme.count());
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
