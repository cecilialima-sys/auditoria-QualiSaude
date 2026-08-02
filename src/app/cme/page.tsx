import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { CmeFormsList, CmeListHeader } from "@/components/cme/CmeFormsList";
export default function CmePage() { return <AppShell><PageHeader eyebrow="Central de Material e Esterilização" title="Formulários CME" action={<CmeListHeader />} /><CmeFormsList /></AppShell>; }
