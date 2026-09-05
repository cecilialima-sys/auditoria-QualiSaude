-- Preserva a evidência registrada pelo auditor e armazena separadamente as versões de IA e aprovadas.
ALTER TABLE "auditoria_respostas"
  ADD COLUMN IF NOT EXISTS "evidencia_original" TEXT,
  ADD COLUMN IF NOT EXISTS "evidencia_ia" TEXT,
  ADD COLUMN IF NOT EXISTS "evidencia_final" TEXT,
  ADD COLUMN IF NOT EXISTS "fonte_evidencia_final" TEXT,
  ADD COLUMN IF NOT EXISTS "evidencia_final_por" TEXT,
  ADD COLUMN IF NOT EXISTS "evidencia_final_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "evidencia_ia_at" TIMESTAMP(3);

-- Auditorias anteriores continuam usando a evidência já registrada como original.
UPDATE "auditoria_respostas"
SET "evidencia_original" = "evidencia"
WHERE "evidencia_original" IS NULL
  AND "evidencia" IS NOT NULL;
