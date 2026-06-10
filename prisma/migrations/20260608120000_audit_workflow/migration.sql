CREATE TYPE "AuditWorkflowStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'SYNC_PENDING', 'CANCELED');

CREATE TABLE "auditorias" (
    "id" TEXT NOT NULL,
    "setor" TEXT NOT NULL,
    "responsavel_setor" TEXT NOT NULL,
    "checklist_id" TEXT NOT NULL,
    "checklist_titulo" TEXT NOT NULL,
    "auditor_id" TEXT NOT NULL,
    "auditor_nome" TEXT NOT NULL,
    "auditor_email" TEXT NOT NULL,
    "tipo_auditoria" TEXT,
    "observacoes_iniciais" TEXT,
    "status" "AuditWorkflowStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "data_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_finalizacao" TIMESTAMP(3),
    "percentual_conformidade" INTEGER,
    "parecer_final" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auditorias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auditoria_respostas" (
    "id" TEXT NOT NULL,
    "auditoria_id" TEXT NOT NULL,
    "checklist_id" TEXT NOT NULL,
    "pergunta_id" TEXT NOT NULL,
    "resposta" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "observacao" TEXT,
    "evidencia" TEXT,
    "risco" TEXT,
    "id_local" TEXT,
    "sincronizado" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auditoria_respostas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auditoria_respostas_id_local_key" ON "auditoria_respostas"("id_local");
CREATE UNIQUE INDEX "auditoria_respostas_auditoria_id_pergunta_id_key" ON "auditoria_respostas"("auditoria_id", "pergunta_id");

ALTER TABLE "auditoria_respostas" ADD CONSTRAINT "auditoria_respostas_auditoria_id_fkey" FOREIGN KEY ("auditoria_id") REFERENCES "auditorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;
