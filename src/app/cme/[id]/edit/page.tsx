import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { CmeFormEditor } from "@/components/cme/CmeFormEditor";
import { getCmeForm } from "@/backend/infrastructure/cme/cmeFormStore";
export default async function EditCmeFormPage({ params }: { params: Promise<{ id: string }> }) { const record = await getCmeForm((await params).id); if (!record) notFound(); return <AppShell><PageHeader eyebrow="Checklists" title="CME - Central de Material e Esterilização" /><CmeFormEditor record={record} /></AppShell>; }
