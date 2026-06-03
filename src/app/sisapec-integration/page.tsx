import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";

const integrations = [
  ["syncUsers()", "Sincronização futura de usuários do QualiSaúde"],
  ["syncSectors()", "Sincronização de setores institucionais"],
  ["validateSisapecToken()", "Validação futura de token SSO"],
  ["getSisapecUserProfile()", "Leitura do perfil unificado"],
  ["sendAuditSummaryToSisapec()", "Envio de resumo da auditoria ao ecossistema QualiSaúde"]
];

export default function SisapecIntegrationPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Ecossistema QualiSaúde" title="Integração QualiSaúde" />
      <div className="card">
        <p className="muted">
          A integração real depende da API institucional, mas o módulo já possui serviço dedicado, contrato de métodos e pontos de extensão para SSO, usuários, setores e resumo de auditorias.
        </p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Método</th><th>Finalidade</th><th>Status</th></tr></thead>
            <tbody>
              {integrations.map(([method, purpose]) => (
                <tr key={method}><td><code>{method}</code></td><td>{purpose}</td><td><span className="badge">Simulado</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

