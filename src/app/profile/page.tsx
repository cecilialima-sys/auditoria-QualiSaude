import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";

export default function ProfilePage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Minha conta" title="Perfil do usuario" />
      <div className="card">
        <div className="grid grid-2">
          <div className="field"><label>Nome</label><input className="input" placeholder="Nome do usuario" /></div>
          <div className="field"><label>E-mail</label><input className="input" placeholder="email@instituicao.com" /></div>
          <div className="field"><label>Perfil</label><input className="input" placeholder="Perfil de acesso" /></div>
          <div className="field"><label>Setores vinculados</label><input className="input" placeholder="Setores autorizados" /></div>
        </div>
        <button className="button" style={{ marginTop: 18 }}>Salvar perfil</button>
      </div>
    </AppShell>
  );
}
