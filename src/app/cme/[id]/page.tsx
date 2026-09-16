import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { CmeFormDetails } from "@/components/cme/CmeFormDetails";
import { getCmeForm } from "@/backend/infrastructure/cme/cmeFormStore";
export default async function CmeDetailsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) { const record = await getCmeForm((await params).id); if (!record) notFound(); const saved = (await searchParams).saved === "1"; return <AppShell><PageHeader eyebrow="Checklists" title="CME - Central de Material e Esterilização" /><CmeFormDetails record={record} saved={saved} /></AppShell>; }
