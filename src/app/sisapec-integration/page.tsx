import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";

const integrations = [
  ["syncUsers()", "Sincronizacao futura de usuarios do QualiSaude"],
  ["syncSectors()", "Sincronizacao de setores institucionais"],
  ["validateSisapecToken()", "Validacao futura de token SSO"],
  ["getSisapecUserProfile()", "Leitura do perfil unificado"],
  ["sendAuditSummaryToSisapec()", "Envio de resumo da auditoria ao ecossistema QualiSaude"]
];

export default function SisapecIntegrationPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Ecossistema QualiSaude" title="Integracao QualiSaude" />
      <div className="card">
        <p className="muted">
          A integracao real depende da API institucional, mas o modulo ja possui servico dedicado, contrato de metodos e pontos de extensao para SSO, usuarios, setores e resumo de auditorias.
        </p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Metodo</th><th>Finalidade</th><th>Status</th></tr></thead>
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
