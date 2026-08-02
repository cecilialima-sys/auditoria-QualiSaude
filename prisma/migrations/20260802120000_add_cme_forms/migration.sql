CREATE TABLE "cme_forms" (
    "id" TEXT NOT NULL,
    "record_date" TIMESTAMP(3) NOT NULL,
    "record_time" TEXT NOT NULL,
    "responsible" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "record_type" TEXT NOT NULL,
    "process" TEXT NOT NULL,
    "equipment" TEXT NOT NULL,
    "equipment_other_description" TEXT,
    "material_name" TEXT NOT NULL,
    "material_code" TEXT,
    "quantity" INTEGER NOT NULL,
    "lot" TEXT,
    "material_notes" TEXT,
    "chemical_indicator" TEXT NOT NULL,
    "biological_indicator" TEXT NOT NULL,
    "bowie_dick_test" TEXT NOT NULL,
    "non_conformities" JSONB NOT NULL DEFAULT '[]',
    "non_conformity_other" TEXT,
    "general_notes" TEXT,
    "signer_name" TEXT NOT NULL,
    "signer_role" TEXT NOT NULL,
    "signature_date" TIMESTAMP(3) NOT NULL,
    "signature_time" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cme_forms_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cme_forms_record_date_idx" ON "cme_forms"("record_date");
CREATE INDEX "cme_forms_sector_idx" ON "cme_forms"("sector");
CREATE INDEX "cme_forms_responsible_idx" ON "cme_forms"("responsible");
CREATE INDEX "cme_forms_process_idx" ON "cme_forms"("process");
