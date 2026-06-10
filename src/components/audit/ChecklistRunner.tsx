"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileDown, Printer, Save, Send } from "lucide-react";
import { ChecklistQuestionInfo } from "@/components/audit/ChecklistQuestionInfo";
import { auditStatuses, riskLevels } from "@/lib/constants/audit-data";
import { calculateCompliance, countByStatus, intelligentConclusion, type AuditStatus } from "@/lib/utils/compliance";

type ResponseState = {
  status: AuditStatus | "";
  observation: string;
  evidence: string;
  risk: string;
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

type ChecklistQuestion = {
  id: string;
  text: string;
  pergunta: string;
  criterion: string;
  explanation?: string;
  explicacao?: string;
  ordem: number;
};

type AuditDetails = {
  auditoria: {
    id: string;
    setor: string;
    responsavelSetor: string;
    checklistId: string;
    checklistTitulo: string;
    auditorId: string;
    auditorNome: string;
    auditorEmail: string;
    tipoAuditoria?: string;
    observacoesIniciais?: string;
    status: "rascunho" | "em_andamento" | "finalizada" | "sincronizacao_pendente" | "cancelada";
    dataInicio: string;
    dataFinalizacao?: string;
  };
  checklist: {
    id: string;
    titulo: string;
    setor: string;
    perguntas: ChecklistQuestion[];
  };
  respostas: Array<{
    perguntaId: string;
    resposta: AuditStatus;
    observacao?: string;
    evidencia?: string;
    risco?: string;
  }>;
};

function emptyResponses(questions: ChecklistQuestion[], saved: AuditDetails["respostas"] = []) {
  const savedByQuestion = new Map(saved.map((response) => [response.perguntaId, response]));
  return Object.fromEntries(
    questions.map((question) => {
      const current = savedByQuestion.get(question.id);
      return [
        question.id,
        {
          status: current?.resposta ?? "",
          observation: current?.observacao ?? "",
          evidence: current?.evidencia ?? "",
          risk: current?.risco ?? "Baixo"
        } satisfies ResponseState
      ];
    })
  );
}

function formatDate(value?: string) {
  if (!value) return "Não informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function statusLabel(status: AuditDetails["auditoria"]["status"]) {
  const labels = {
    rascunho: "Rascunho",
    em_andamento: "Em andamento",
    finalizada: "Finalizada",
    sincronizacao_pendente: "Sincronização pendente",
    cancelada: "Cancelada"
  };
  return labels[status] ?? status;
}

export function ChecklistRunner({ auditId }: { auditId?: string }) {
  const [responses, setResponses] = useState<Record<string, ResponseState>>({});
  const [signed, setSigned] = useState(false);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [auditDetails, setAuditDetails] = useState<AuditDetails | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(Boolean(auditId));
  const [loadingReport, setLoadingReport] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [reportError, setReportError] = useState("");
  const [draftMessage, setDraftMessage] = useState("");
  const [lastReport, setLastReport] = useState<GeneratedReport | null>(null);

  const selectedItems = auditDetails?.checklist.perguntas ?? [];
  const auditFinalized = auditDetails?.auditoria.status === "finalizada";

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

  useEffect(() => {
    if (!auditId) return;
    setLoadingAudit(true);
    fetch(`/api/auditorias/${encodeURIComponent(auditId)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar a auditoria.");
        return data as AuditDetails;
      })
      .then((data) => {
        setAuditDetails(data);
        setResponses(emptyResponses(data.checklist.perguntas, data.respostas));
      })
      .catch((error) => setReportError(error instanceof Error ? error.message : "Não foi possível carregar a auditoria."))
      .finally(() => setLoadingAudit(false));
  }, [auditId]);

  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "Existem respostas não salvas. Deseja sair mesmo assim?";
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  function update(id: string, patch: Partial<ResponseState>) {
    setResponses((current) => ({
      ...current,
      [id]: { ...current[id], ...patch }
    }));
    setDirty(true);
    setDraftMessage("");
  }

  function payloadResponses(includeOnlyAnswered = true) {
    return selectedItems
      .map((item) => ({ item, response: responses[item.id] }))
      .filter(({ response }) => (includeOnlyAnswered ? Boolean(response?.status) : true))
      .map(({ item, response }) => ({
        perguntaId: item.id,
        resposta: response?.status || "",
        status: response?.status || "",
        observacao: response?.observation || "",
        evidencia: response?.evidence || "",
        risco: response?.risk || ""
      }));
  }

  async function saveProgress(silent = false) {
    if (!auditId) return;
    setReportError("");
    setSavingDraft(true);
    try {
      const draftResponses = payloadResponses(true);
      if (!draftResponses.length) {
        setDraftMessage("Nenhuma resposta preenchida para salvar.");
        return;
      }
      const response = await fetch(`/api/auditorias/${encodeURIComponent(auditId)}/respostas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respostas: draftResponses })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar respostas.");
      setDirty(false);
      if (!silent) setDraftMessage("Rascunho salvo com sucesso.");
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "Não foi possível salvar respostas.");
    } finally {
      setSavingDraft(false);
    }
  }

  async function finalizeAndGenerateReport() {
    setReportError("");
    setDraftMessage("");
    setLastReport(null);

    if (!auditId) {
      setReportError("Inicie uma auditoria antes de preencher o checklist.");
      return;
    }

    if (!allAnswered) {
      setReportError("Responda todos os itens do checklist antes de finalizar.");
      return;
    }

    if (!signed) {
      setReportError("Confirme digitalmente a finalização da auditoria.");
      return;
    }

    setLoadingReport(true);
    try {
      const response = await fetch(`/api/auditorias/${encodeURIComponent(auditId)}/finalizar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respostas: payloadResponses(false) })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Não foi possível finalizar a auditoria.");
      }

      setAuditDetails((current) => current ? { ...current, auditoria: data.auditoria } : current);
      setDirty(false);
      setLastReport(data.report);
      window.open(data.report.viewUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "Erro ao finalizar auditoria.");
    } finally {
      setLoadingReport(false);
    }
  }

  if (!auditId) {
    return (
      <section className="card empty-state">
        <h3>Checklist sem auditoria vinculada</h3>
        <p className="muted">
          O checklist só pode ser iniciado depois que uma auditoria for criada com setor, responsável e checklist selecionado.
        </p>
        <Link className="button" href="/audits/new">Criar nova auditoria</Link>
      </section>
    );
  }

  if (loadingAudit) {
    return (
      <section className="card empty-state">
        <h3>Carregando auditoria</h3>
        <p className="muted">Buscando dados da auditoria e checklist vinculado.</p>
      </section>
    );
  }

  if (!auditDetails) {
    return (
      <section className="card empty-state">
        <h3>Não foi possível abrir o checklist</h3>
        <p className="muted">{reportError || "Auditoria não encontrada."}</p>
        <Link className="button" href="/audits/new">Criar nova auditoria</Link>
      </section>
    );
  }

  return (
    <div className="grid">
      <section className="card" aria-labelledby="audit-context-title">
        <h2 className="section-title" id="audit-context-title">Auditoria em andamento</h2>
        <div className="grid grid-4">
          <article>
            <div className="muted">Setor</div>
            <strong>{auditDetails.auditoria.setor}</strong>
          </article>
          <article>
            <div className="muted">Responsável do setor</div>
            <strong>{auditDetails.auditoria.responsavelSetor}</strong>
          </article>
          <article>
            <div className="muted">Auditor</div>
            <strong>{auditDetails.auditoria.auditorNome || user?.name || "Não informado"}</strong>
          </article>
          <article>
            <div className="muted">Status</div>
            <span className={`badge ${auditFinalized ? "success" : ""}`}>{statusLabel(auditDetails.auditoria.status)}</span>
          </article>
          <article>
            <div className="muted">Checklist</div>
            <strong>{auditDetails.checklist.titulo}</strong>
          </article>
          <article>
            <div className="muted">Data de início</div>
            <strong>{formatDate(auditDetails.auditoria.dataInicio)}</strong>
          </article>
          <article>
            <div className="muted">Tipo</div>
            <strong>{auditDetails.auditoria.tipoAuditoria || "Não informado"}</strong>
          </article>
          <article>
            <div className="muted">Auditoria ID</div>
            <strong>{auditDetails.auditoria.id}</strong>
          </article>
        </div>
        {auditDetails.auditoria.observacoesIniciais ? (
          <p className="muted" style={{ marginTop: 14 }}>{auditDetails.auditoria.observacoesIniciais}</p>
        ) : null}
      </section>

      <section className="card" aria-labelledby="checklist-progress-title">
        <h2 className="section-title" id="checklist-progress-title">Resumo do checklist</h2>
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

      <section className="grid" aria-labelledby="checklist-items-title">
        <h2 className="sr-only" id="checklist-items-title">Perguntas do checklist</h2>
        {selectedItems.map((item) => (
          <article className="card checklist-item" key={item.id}>
            <div className="checklist-question-header">
              <div>
                <span className="badge">{auditDetails.checklist.titulo}</span>
                <h3>
                  {item.text}
                  {item.explanation || item.explicacao ? <ChecklistQuestionInfo explanation={item.explanation || item.explicacao || ""} /> : null}
                </h3>
                {item.criterion ? <p className="muted">{item.criterion}</p> : null}
              </div>
            </div>

            <div className="status-grid" role="group" aria-label={`Resposta para ${item.text}`}>
              {auditStatuses.map((status) => (
                <button
                  className={`status-option ${responses[item.id]?.status === status ? "selected" : ""}`}
                  disabled={auditFinalized}
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
                <select
                  className="input"
                  disabled={auditFinalized}
                  id={`${item.id}-risk`}
                  value={responses[item.id]?.risk ?? "Baixo"}
                  onChange={(event) => update(item.id, { risk: event.target.value })}
                >
                  {riskLevels.map((risk) => (
                    <option key={risk}>{risk}</option>
                  ))}
                </select>
              </div>
              <div className="field field-wide">
                <label htmlFor={`${item.id}-observation`}>Observação do auditor</label>
                <input
                  className="input"
                  disabled={auditFinalized}
                  id={`${item.id}-observation`}
                  value={responses[item.id]?.observation ?? ""}
                  onChange={(event) => update(item.id, { observation: event.target.value })}
                />
              </div>
              <div className="field field-wide">
                <label htmlFor={`${item.id}-evidence`}>Evidência, se houver</label>
                <input
                  className="input"
                  disabled={auditFinalized}
                  id={`${item.id}-evidence`}
                  value={responses[item.id]?.evidence ?? ""}
                  onChange={(event) => update(item.id, { evidence: event.target.value })}
                />
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="card" aria-labelledby="automatic-report-title">
        <h2 className="section-title" id="automatic-report-title">Relatório automático</h2>
        <div className="grid grid-4">
          <div>Conformes: <strong>{counts["Conforme"] ?? 0}</strong></div>
          <div>Não conformes: <strong>{counts["Não conforme"] ?? 0}</strong></div>
          <div>Não aplicáveis: <strong>{counts["Não se aplica"] ?? 0}</strong></div>
        </div>
        <p>{intelligentConclusion(compliance.classification)}</p>
        {draftMessage ? <div className="badge success">{draftMessage}</div> : null}
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
          <input checked={signed} disabled={auditFinalized} onChange={(event) => setSigned(event.target.checked)} type="checkbox" />
          Confirmo digitalmente a finalização desta auditoria.
        </label>
        <div className="button-row">
          <button className="button secondary" disabled={auditFinalized || savingDraft} onClick={() => saveProgress()} type="button">
            <Save size={18} aria-hidden="true" />
            {savingDraft ? "Salvando..." : "Salvar rascunho"}
          </button>
          {lastReport ? (
            <a className="button secondary" href={lastReport.downloadUrl}>
              <FileDown size={18} aria-hidden="true" />
              Exportar PDF
            </a>
          ) : null}
          <button className="button" disabled={auditFinalized || !signed || !allAnswered || loadingReport} onClick={finalizeAndGenerateReport} type="button">
            <Send size={18} aria-hidden="true" />
            {loadingReport ? "Finalizando..." : "Finalizar auditoria e gerar PDF"}
          </button>
        </div>
      </section>
    </div>
  );
}
