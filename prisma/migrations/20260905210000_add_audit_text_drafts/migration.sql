CREATE TABLE "auditoria_rascunhos_texto" (
  "id" TEXT NOT NULL,
  "auditoria_id" TEXT NOT NULL,
  "pergunta_id" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "value" TEXT NOT NULL DEFAULT '',
  "revision" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "auditoria_rascunhos_texto_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "auditoria_rascunhos_texto_auditoria_id_fkey" FOREIGN KEY ("auditoria_id") REFERENCES "auditorias"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "auditoria_rascunhos_texto_auditoria_id_pergunta_id_field_key" ON "auditoria_rascunhos_texto"("auditoria_id", "pergunta_id", "field");
