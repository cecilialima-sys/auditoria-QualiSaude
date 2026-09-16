import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { CmeFormEditor } from "@/components/cme/CmeFormEditor";
export default function NewCmeFormPage() { return <AppShell><PageHeader eyebrow="Checklists" title="CME - Central de Material e Esterilização" /><CmeFormEditor /></AppShell>; }
