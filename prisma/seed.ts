import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import * as bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const temas: { slug: string; name: string; icon: string; color: string; order: number }[] = [
    {
      slug: "CONFIGURACAO_GERAL",
      name: "Configuração Geral",
      icon: "settings",
      color: "#3b82f6",
      order: 1,
    },
    {
      slug: "FLUXO_COMUNICACAO",
      name: "Fluxo de Comunicação",
      icon: "network",
      color: "#f59e0b",
      order: 2,
    },
    {
      slug: "USABILIDADE",
      name: "Usabilidade",
      icon: "mouse-pointer-click",
      color: "#8b5cf6",
      order: 3,
    },
    {
      slug: "PABX",
      name: "PABX",
      icon: "phone",
      color: "#10b981",
      order: 4,
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

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const MASTER_EMAIL = "joao.silva@opasuite.com.br";
  if (adminEmail && adminPassword) {
    const isMaster = adminEmail.toLowerCase() === MASTER_EMAIL;
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        name: isMaster ? "Master" : "Administrador",
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 12),
        role: isMaster ? "MASTER" : "ADMIN",
      },
    });
    console.log(`Conta de acesso criada/verificada para ${adminEmail} (${isMaster ? "master" : "admin"}).`);
  } else {
    console.warn("ADMIN_EMAIL/ADMIN_PASSWORD não definidos, admin não criado.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());