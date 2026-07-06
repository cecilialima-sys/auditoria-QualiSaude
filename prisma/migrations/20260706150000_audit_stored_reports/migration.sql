CREATE TABLE "audit_stored_reports" (
    "id" TEXT NOT NULL,
    "audit_code" TEXT NOT NULL,
    "checklist_id" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "audit_type" TEXT NOT NULL,
    "auditor_id" TEXT NOT NULL,
    "auditor_name" TEXT NOT NULL,
    "compliance_percentage" INTEGER NOT NULL,
    "result" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL,
    "file_hash" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 2,
    "document_json" JSONB NOT NULL,
    "html_content" TEXT NOT NULL,
    "pdf_content" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_stored_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "audit_stored_reports_audit_code_key" ON "audit_stored_reports"("audit_code");
CREATE INDEX "audit_stored_reports_checklist_id_idx" ON "audit_stored_reports"("checklist_id");
