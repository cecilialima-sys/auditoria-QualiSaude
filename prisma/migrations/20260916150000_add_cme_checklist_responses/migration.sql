-- Mantém registros CME existentes e adiciona somente as respostas do checklist 4.4.
ALTER TABLE "cme_forms"
ADD COLUMN "checklist_responses" JSONB NOT NULL DEFAULT '[]';
