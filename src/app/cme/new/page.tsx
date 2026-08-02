import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { CmeFormEditor } from "@/components/cme/CmeFormEditor";
export default function NewCmeFormPage() { return <AppShell><PageHeader eyebrow="Central de Material e Esterilização" title="Novo formulário CME" /><CmeFormEditor /></AppShell>; }
