import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { CmeFormsList, CmeListHeader } from "@/components/cme/CmeFormsList";
export default function CmePage() { return <AppShell><PageHeader eyebrow="Checklists" title="CME - Central de Material e Esterilização" action={<CmeListHeader />} /><CmeFormsList /></AppShell>; }
