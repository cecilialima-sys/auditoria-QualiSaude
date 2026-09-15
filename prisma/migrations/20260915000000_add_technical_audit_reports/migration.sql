CREATE TYPE "TechnicalReportStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'READY');

CREATE TABLE "relatorios_tecnico_criticos" (
  "id" TEXT NOT NULL,
  "auditoria_id" TEXT NOT NULL,
  "audit_code" TEXT NOT NULL,
  "status" "TechnicalReportStatus" NOT NULL DEFAULT 'PENDING',
  "document_json" JSONB NOT NULL,
  "html_content" TEXT NOT NULL,
  "pdf_content" BYTEA NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "relatorios_tecnico_criticos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "relatorios_tecnico_criticos_auditoria_id_key" ON "relatorios_tecnico_criticos"("auditoria_id");
CREATE UNIQUE INDEX "relatorios_tecnico_criticos_audit_code_key" ON "relatorios_tecnico_criticos"("audit_code");

ALTER TABLE "relatorios_tecnico_criticos"
  ADD CONSTRAINT "relatorios_tecnico_criticos_auditoria_id_fkey"
  FOREIGN KEY ("auditoria_id") REFERENCES "auditorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;
