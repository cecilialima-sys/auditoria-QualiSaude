"use client";

import { useEffect, useMemo, useState } from "react";
import { FileDown, Printer, Save, Send } from "lucide-react";
import { ChecklistQuestionInfo } from "@/components/audit/ChecklistQuestionInfo";
import { auditStatuses, auditTypes, riskLevels } from "@/lib/constants/audit-data";
import { checklistTemplateGroups } from "@/lib/checklists/checklist-template";
import { calculateCompliance, countByStatus, intelligentConclusion, type AuditStatus } from "@/lib/utils/compliance";

type ResponseState = {
  status: AuditStatus | "";
  observation: string;
  risk: string;
  deadline: string;
};

type AuthenticatedUser = {
  name: string;
  email: string;
  role: string;
};

type GeneratedReport = {
  id: string;
  auditCode: string;
  result: string;
  compliancePercentage: number;
  viewUrl: string;
  downloadUrl: string;
};

const flatItems = checklistTemplateGroups.flatMap((group) =>
  group.questions.map((question) => ({
    id: question.id,
    category: group.category,
    sector: group.sector,
    item: question.text,
    criterion: question.criterion,
    explanation: question.explanation
  }))
);

const initialResponses = Object.fromEntries(
  flatItems.map((item) => [
    item.id,
    {
      status: "",
      observation: "",
      risk: "Baixo",
      deadline: ""
    } satisfies ResponseState
  ])
);

export function ChecklistRunner() {
  const [responses, setResponses] = useState<Record<string, ResponseState>>(initialResponses);
  const [selectedGroupId, setSelectedGroupId] = useState(checklistTemplateGroups[0]?.id ?? "");
  const [signed, setSigned] = useState(false);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [sectorResponsible, setSectorResponsible] = useState("");
  const [auditDate, setAuditDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [auditType, setAuditType] = useState("");
  const [finalStatus, setFinalStatus] = useState("Em andamento");
  const [unit, setUnit] = useState("");
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState("");
  const [lastReport, setLastReport] = useState<GeneratedReport | null>(null);

  const selectedGroup = useMemo(
    () => checklistTemplateGroups.find((group) => group.id === selectedGroupId) ?? checklistTemplateGroups[0],
    [selectedGroupId]
  );
  const selectedItems = useMemo(
    () => flatItems.filter((item) => item.category === selectedGroup?.category),
    [selectedGroup]
  );

  const scoredResponses = useMemo(
    () =>
      selectedItems
        .map((item) => responses[item.id])
        .filter((response): response is ResponseState & { status: AuditStatus } => Boolean(response?.status)),
    [responses, selectedItems]
  );
  const compliance = useMemo(() => calculateCompliance(scoredResponses), [scoredResponses]);
  const counts = useMemo(() => countByStatus(scoredResponses), [scoredResponses]);
  const answered = scoredResponses.length;
  const totalItems = selectedItems.length;
  const progress = totalItems ? Math.round((answered / totalItems) * 100) : 0;
  const allAnswered = totalItems > 0 && answered === totalItems;

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => undefined);
  }, []);

  function update(id: string, patch: Partial<ResponseState>) {
    setResponses((current) => ({
      ...current,
      [id]: { ...current[id], ...patch }
    }));
  }

  function saveProgress() {
    localStorage.setItem(
      `qualisaude-checklist-progress-${selectedGroupId}`,
      JSON.stringify({ responses, sectorResponsible, auditDate, auditType, finalStatus, unit, savedAt: new Date().toISOString() })
    );
  }

  async function finalizeAndGenerateReport() {
    setReportError("");
    setLastReport(null);

    if (!allAnswered) {
      setReportError("Responda todos os itens do checklist antes de finalizar.");
      return;
    }

    if (!signed) {
      setReportError("Confirme digitalmente a finalização da auditoria.");
      return;
    }

    if (!auditType) {
      setReportError("Selecione o tipo de auditoria.");
      return;
    }

    setLoadingReport(true);
    try {
      const response = await fetch("/api/audits/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklistId: selectedGroup.id,
          institution: "QualiSaúde Hospitalar",
          sector: selectedGroup.category,
          auditType,
          auditDate: `${auditDate}T00:00:00`,
          sectorResponsible,
          unit,
          signed,
          responses: selectedItems.map((item) => ({
            questionId: item.id,
            item: item.item,
            criterion: item.criterion,
            status: responses[item.id].status,
            observation: responses[item.id].observation,
            risk: responses[item.id].risk,
            deadline: responses[item.id].deadline
          }))
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível gerar o relatório.");
      }

      setFinalStatus("Finalizada");
      setLastReport(data.report);
      window.open(data.report.viewUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "Erro ao gerar relatório.");
    } finally {
      setLoadingReport(false);
    }
  }

  return (
    <div className="grid">
      <section className="card" aria-labelledby="checklist-progress-title">
        <h2 className="section-title" id="checklist-progress-title">Resumo do checklist</h2>
        <div className="field" style={{ marginBottom: 16 }}>
          <label htmlFor="checklist-area">Área/setor do checklist</label>
          <select
            className="input"
            id="checklist-area"
            value={selectedGroupId}
            onChange={(event) => {
              setSelectedGroupId(event.target.value);
              setSigned(false);
              setLastReport(null);
              setReportError("");
            }}
          >
            {checklistTemplateGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.category} ({group.questions.length} itens)
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-4">
          <article>
            <div className="muted">Progresso</div>
            <div className="metric-value">{progress}%</div>
          </article>
          <article>
            <div className="muted">Conformidade</div>
            <div className="metric-value">{compliance.percentage}%</div>
          </article>
          <article>
            <div className="muted">Classificação</div>
            <span className={`badge ${compliance.classification === "Crítico" ? "danger" : compliance.classification === "Atenção" ? "warning" : "success"}`}>
              {compliance.classification}
            </span>
          </article>
          <article>
            <div className="muted">Itens aplicáveis</div>
            <div className="metric-value">{compliance.applicable}</div>
          </article>
        </div>
        <div className="progress" style={{ marginTop: 14 }}>
          <span style={{ width: `${progress}%` }} />
        </div>
      </section>

      <section className="card" aria-labelledby="audit-identification-title">
        <h2 className="section-title" id="audit-identification-title">Identificação da auditoria</h2>
        <div className="grid grid-3">
          <div className="field">
            <label htmlFor="audit-sector">Setor auditado</label>
            <input className="input" id="audit-sector" placeholder="Setor auditado" value={selectedGroup?.category ?? ""} readOnly />
          </div>
          <div className="field">
            <label htmlFor="audit-auditor">Auditor</label>
            <input className="input" id="audit-auditor" placeholder="Usuário autenticado" readOnly value={user ? `${user.name} (${user.role})` : "Carregando usuário logado..."} />
          </div>
          <div className="field">
            <label htmlFor="audit-manager">Responsável pelo setor</label>
            <input className="input" id="audit-manager" placeholder="Responsável pelo setor" value={sectorResponsible} onChange={(event) => setSectorResponsible(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="audit-unit">Unidade, setor ou leito</label>
            <input className="input" id="audit-unit" placeholder="Ex.: Leito 03" value={unit} onChange={(event) => setUnit(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="audit-date">Data</label>
            <input className="input" id="audit-date" type="date" value={auditDate} onChange={(event) => setAuditDate(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="audit-type">Tipo de auditoria</label>
            <select className="input" id="audit-type" value={auditType} onChange={(event) => setAuditType(event.target.value)}>
              <option value="" disabled>Selecione o tipo</option>
              {auditTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="audit-final-status">Status final</label>
            <select className="input" id="audit-final-status" value={finalStatus} onChange={(event) => setFinalStatus(event.target.value)}>
              <option>Em andamento</option>
              <option>Finalizada</option>
              <option>Pendente</option>
            </select>
          </div>
        </div>
      </section>

      <section className="grid" aria-labelledby="checklist-items-title">
        <h2 className="sr-only" id="checklist-items-title">Perguntas do checklist</h2>
        {selectedItems.length ? (
          selectedItems.map((item) => (
            <article className="card checklist-item" key={item.id}>
              <div className="checklist-question-header">
                <div>
                  <span className="badge">{item.category}</span>
                  <h3>
                    {item.item}
                    {item.explanation ? <ChecklistQuestionInfo explanation={item.explanation} /> : null}
                  </h3>
                  {item.criterion ? <p className="muted">{item.criterion}</p> : null}
                </div>
              </div>

              <div className="status-grid" role="group" aria-label={`Resposta para ${item.item}`}>
                {auditStatuses.map((status) => (
                  <button
                    className={`status-option ${responses[item.id].status === status ? "selected" : ""}`}
                    key={status}
                    onClick={() => update(item.id, { status })}
                    type="button"
                  >
                    {status}
                  </button>
                ))}
              </div>

              <div className="grid grid-3">
                <div className="field">
                  <label htmlFor={`${item.id}-risk`}>Grau de risco</label>
                  <select className="input" id={`${item.id}-risk`} value={responses[item.id].risk} onChange={(event) => update(item.id, { risk: event.target.value })}>
                    {riskLevels.map((risk) => (
                      <option key={risk}>{risk}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor={`${item.id}-deadline`}>Prazo para correção</label>
                  <input className="input" id={`${item.id}-deadline`} type="date" value={responses[item.id].deadline} onChange={(event) => update(item.id, { deadline: event.target.value })} />
                </div>
                <div className="field field-wide">
                  <label htmlFor={`${item.id}-observation`}>Observação do auditor</label>
                  <input className="input" id={`${item.id}-observation`} value={responses[item.id].observation} onChange={(event) => update(item.id, { observation: event.target.value })} />
                </div>
              </div>
            </article>
          ))
        ) : (
          <article className="card empty-state">
            <h3>Nenhum checklist cadastrado</h3>
            <p className="muted">
              A estrutura da tela está pronta. Os checklists devem ser adicionados em `src/lib/checklists/checklist-template.ts`, organizados por setor, categoria, pergunta, critério e explicação.
            </p>
          </article>
        )}
      </section>

      <section className="card" aria-labelledby="automatic-report-title">
        <h2 className="section-title" id="automatic-report-title">Relatório automático</h2>
        <div className="grid grid-4">
          <div>Conformes: <strong>{counts["Conforme"] ?? 0}</strong></div>
          <div>Não conformes: <strong>{counts["Não conforme"] ?? 0}</strong></div>
          <div>Não aplicáveis: <strong>{counts["Não se aplica"] ?? 0}</strong></div>
        </div>
        <p>{intelligentConclusion(compliance.classification)}</p>
        {reportError ? <div className="badge danger">{reportError}</div> : null}
        {lastReport ? (
          <div className="card" style={{ background: "#f6fbff", boxShadow: "none" }}>
            <strong>Relatório gerado: {lastReport.auditCode}</strong>
            <p className="muted">
              Resultado: {lastReport.result} | Conformidade: {lastReport.compliancePercentage}%
            </p>
            <div className="button-row">
              <a className="button secondary" href={lastReport.viewUrl} target="_blank" rel="noreferrer">
                Ver relatório
              </a>
              <a className="button secondary" href={lastReport.downloadUrl}>
                Baixar PDF
              </a>
              <button className="button secondary" onClick={() => window.open(lastReport.viewUrl, "_blank", "noopener,noreferrer")} type="button">
                <Printer size={18} aria-hidden="true" />
                Imprimir
              </button>
            </div>
          </div>
        ) : null}
        <label className="inline-check">
          <input checked={signed} onChange={(event) => setSigned(event.target.checked)} type="checkbox" />
          Confirmo digitalmente a finalização desta auditoria.
        </label>
        <div className="button-row">
          <button className="button secondary" onClick={saveProgress} type="button">
            <Save size={18} aria-hidden="true" />
            Salvar progresso
          </button>
          {lastReport ? (
            <a className="button secondary" href={lastReport.downloadUrl}>
              <FileDown size={18} aria-hidden="true" />
              Exportar PDF
            </a>
          ) : null}
          <a className="button secondary" href="/api/exports/excel">
            <FileDown size={18} aria-hidden="true" />
            Exportar Excel
          </a>
          <button className="button" disabled={!signed || !allAnswered || loadingReport} onClick={finalizeAndGenerateReport} type="button">
            <Send size={18} aria-hidden="true" />
            {loadingReport ? "Gerando relatório..." : "Finalizar auditoria e gerar PDF"}
          </button>
        </div>
      </section>
    </div>
  );
}
