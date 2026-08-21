-- AlterTable
ALTER TABLE "Theme" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- Ordenação dos temas: Configuração Geral, Fluxo de Comunicação, Usabilidade, PABX
UPDATE "Theme" SET "order" = 1 WHERE "slug" = 'CONFIGURACAO_GERAL';
UPDATE "Theme" SET "order" = 2 WHERE "slug" = 'FLUXO_COMUNICACAO';
UPDATE "Theme" SET "order" = 3 WHERE "slug" = 'USABILIDADE';
UPDATE "Theme" SET "order" = 4 WHERE "slug" = 'PABX';

-- Temas sem ordem definida herdam as próximas posições disponíveis
UPDATE "Theme" t
SET "order" = base.max_order + ordered.rn
FROM (
  SELECT COALESCE(MAX("order"), 0) AS max_order FROM "Theme"
) base,
(
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt") AS rn
  FROM "Theme"
  WHERE "order" = 0
) ordered
WHERE t.id = ordered.id;
