"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FileDown, Printer, Save, Send, Sparkles } from "lucide-react";
import { ChecklistQuestionInfo } from "@/components/audit/ChecklistQuestionInfo";
import { checklistQuestionInfo } from "@/lib/checklists/question-info";
import { auditStatuses, riskLevels } from "@/lib/constants/audit-data";
import { calculateCompliance, countByStatus, intelligentConclusion, type AuditStatus } from "@/lib/utils/compliance";

type ResponseState = {
  status: AuditStatus | "";
  observation: string;
  evidence: string;
  aiSuggestion: string;
  finalEvidence: string;
  finalEvidenceSource: "original" | "ia" | "manual" | "";
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
  metrics?: {
    totalItems: number;
    applicableItems: number;
    conformingItems: number;
    nonConformingItems: number;
    notApplicableItems: number;
    compliancePercentage: number;
    nonCompliancePercentage: number;
    result: string;
  };
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
  section?: string;
  itemNumber?: string;
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
    evidenciaOriginal?: string;
    evidenciaIa?: string;
    evidenciaFinal?: string;
    fonteEvidenciaFinal?: "original" | "ia" | "manual";
    risco?: string;
  }>;
  rascunhosTexto?: Array<{ perguntaId: string; campo: "observacao" | "evidencia"; valor: string; revisao: number; updatedAt: string }>;
};

type TextField = "observation" | "evidence";
type FieldSync = "idle" | "dirty" | "saving" | "saved" | "error" | "conflict";

function emptyResponses(questions: ChecklistQuestion[], saved: AuditDetails["respostas"] = [], drafts: NonNullable<AuditDetails["rascunhosTexto"]> = []) {
  const savedByQuestion = new Map(saved.map((response) => [response.perguntaId, response]));
  const draftsByField = new Map(drafts.map((draft) => [`${draft.perguntaId}:${draft.campo}`, draft]));
  return Object.fromEntries(
    questions.map((question) => {
      const current = savedByQuestion.get(question.id);
      return [
        question.id,
        {
          status: current?.resposta ?? "",
          observation: draftsByField.get(`${question.id}:observacao`)?.valor ?? current?.observacao ?? "",
          evidence: draftsByField.get(`${question.id}:evidencia`)?.valor ?? current?.evidenciaOriginal ?? current?.evidencia ?? "",
          aiSuggestion: current?.evidenciaIa ?? "",
          finalEvidence: current?.evidenciaFinal ?? "",
          finalEvidenceSource: current?.fonteEvidenciaFinal ?? "",
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

function questionInfoText(item: ChecklistQuestion) {
  return checklistQuestionInfo(item);
}

function resizeTextarea(element: HTMLTextAreaElement) {
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
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
  const [improvingEvidenceIds, setImprovingEvidenceIds] = useState<Record<string, boolean>>({});
  const [improvingAllEvidence, setImprovingAllEvidence] = useState(false);
  const [fieldSync, setFieldSync] = useState<Record<string, FieldSync>>({});
  const [recoveryDrafts, setRecoveryDrafts] = useState<Record<string, { value: string; updatedAt: number }>>({});
  const queuesRef = useRef<Record<string, { value: string; revision: number; serverRevision: number; confirmed: string; timer?: ReturnType<typeof setTimeout>; running?: Promise<void>; attempts: number }>>({});
  const responsesRef = useRef(responses);
  const hydratedRef = useRef(false);

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
        const initial = emptyResponses(data.checklist.perguntas, data.respostas, data.rascunhosTexto);
        const queues: typeof queuesRef.current = {};
        const local: Record<string, { value: string; updatedAt: number }> = {};
        (data.rascunhosTexto ?? []).forEach((draft) => {
          const key = `${draft.perguntaId}:${draft.campo}`;
          queues[key] = { value: draft.valor, confirmed: draft.valor, revision: draft.revisao, serverRevision: draft.revisao, attempts: 0 };
          try {
            const backup = JSON.parse(localStorage.getItem(`auditDraft:${data.auditoria.id}:${key}`) ?? "null");
            if (backup?.value !== draft.valor && Number(backup?.updatedAt) > new Date(draft.updatedAt).getTime()) local[key] = backup;
          } catch { /* Backup local inválido não bloqueia a auditoria. */ }
        });
        queuesRef.current = queues;
        responsesRef.current = initial;
        setResponses(initial);
        setRecoveryDrafts(local);
        hydratedRef.current = true;
      })
      .catch((error) => setReportError(error instanceof Error ? error.message : "Não foi possível carregar a auditoria."))
      .finally(() => setLoadingAudit(false));
  }, [auditId]);

  useEffect(() => { responsesRef.current = responses; }, [responses]);

  useEffect(() => {
    document.querySelectorAll<HTMLTextAreaElement>("textarea[data-autogrow='true']").forEach(resizeTextarea);
  }, [responses, selectedItems]);

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

  function fieldKey(questionId: string, field: TextField) { return `${questionId}:${field === "observation" ? "observacao" : "evidencia"}`; }

  async function processTextDraft(key: string, questionId: string, field: TextField) {
    const queue = queuesRef.current[key];
    if (!queue || queue.running || !auditId) return queue?.running;
    queue.running = (async () => {
      while (queue.value !== queue.confirmed) {
        const value = queue.value;
        const revision = queue.serverRevision;
        setFieldSync((current) => ({ ...current, [key]: "saving" }));
        try {
          const response = await fetch(`/api/auditorias/${encodeURIComponent(auditId)}/rascunhos-texto`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, keepalive: true,
            body: JSON.stringify({ perguntaId: questionId, campo: field === "observation" ? "observacao" : "evidencia", valor: value, revisaoBase: revision })
          });
          const data = await response.json();
          if (response.status === 409) { setFieldSync((current) => ({ ...current, [key]: "conflict" })); return; }
          if (!response.ok) throw new Error(data.error ?? "Falha no autosave");
          queue.serverRevision = data.draft.revisao;
          queue.confirmed = value;
          queue.attempts = 0;
          localStorage.removeItem(`auditDraft:${auditId}:${key}`);
          setFieldSync((current) => ({ ...current, [key]: queue.value === value ? "saved" : "dirty" }));
        } catch {
          queue.attempts += 1;
          setFieldSync((current) => ({ ...current, [key]: "error" }));
          if (queue.attempts <= 2) window.setTimeout(() => void processTextDraft(key, questionId, field), 3000 * queue.attempts);
          return;
        }
      }
    })().finally(() => { queue.running = undefined; });
    return queue.running;
  }

  function scheduleTextDraft(questionId: string, field: TextField, value: string, immediate = false) {
    if (!auditId || !hydratedRef.current || auditFinalized) return;
    const key = fieldKey(questionId, field);
    const queue = queuesRef.current[key] ?? { value: "", confirmed: "", revision: 0, serverRevision: 0, attempts: 0 };
    queue.value = value;
    queue.revision += 1;
    queuesRef.current[key] = queue;
    localStorage.setItem(`auditDraft:${auditId}:${key}`, JSON.stringify({ value, updatedAt: Date.now() }));
    setFieldSync((current) => ({ ...current, [key]: "dirty" }));
    if (queue.timer) clearTimeout(queue.timer);
    if (immediate) void processTextDraft(key, questionId, field);
    else queue.timer = setTimeout(() => void processTextDraft(key, questionId, field), 1000);
  }

  function updateText(id: string, field: TextField, value: string) {
    update(id, { [field]: value });
    scheduleTextDraft(id, field, value);
  }

  async function flushTextDrafts() {
    await Promise.all(Object.keys(queuesRef.current).map((key) => {
      const [questionId, campo] = key.split(":");
      const field = campo === "observacao" ? "observation" : "evidence";
      const queue = queuesRef.current[key];
      if (queue.timer) clearTimeout(queue.timer);
      return processTextDraft(key, questionId, field);
    }));
  }

  function restoreLocalDrafts() {
    Object.entries(recoveryDrafts).forEach(([key, draft]) => {
      const [questionId, campo] = key.split(":");
      const field = campo === "observacao" ? "observation" : "evidence";
      setResponses((current) => ({ ...current, [questionId]: { ...current[questionId], [field]: draft.value } }));
      scheduleTextDraft(questionId, field, draft.value, true);
    });
    setRecoveryDrafts({});
  }

  useEffect(() => {
    const flush = () => { void flushTextDrafts(); };
    window.addEventListener("pagehide", flush);
    window.addEventListener("online", flush);
    return () => { window.removeEventListener("pagehide", flush); window.removeEventListener("online", flush); };
  });

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
        evidenciaOriginal: response?.evidence || "",
        evidenciaIa: response?.aiSuggestion || "",
        evidenciaFinal: response?.finalEvidence || "",
        fonteEvidenciaFinal: response?.finalEvidenceSource || undefined,
        risco: response?.risk || ""
      }));
  }

  async function saveProgress(silent = false) {
    if (!auditId) return;
    setReportError("");
    setSavingDraft(true);
    try {
      await flushTextDrafts();
      if (Object.values(queuesRef.current).some((queue) => queue.value !== queue.confirmed)) {
        throw new Error("Há textos que ainda não foram confirmados pelo servidor. Verifique os campos sinalizados antes de continuar.");
      }
      const draftResponses = payloadResponses(true);
      const response = await fetch(`/api/auditorias/${encodeURIComponent(auditId)}/respostas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ respostas: draftResponses })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar respostas.");
      setDirty(false);
      if (!silent) setDraftMessage("Auditoria salva com sucesso em Não finalizadas.");
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "Não foi possível salvar respostas.");
    } finally {
      setSavingDraft(false);
    }
  }

  async function improveEvidence(item: ChecklistQuestion) {
    if (!auditId || auditFinalized) return;
    const current = responses[item.id];
    if (!current?.evidence.trim()) {
      setReportError("Adicione uma evidência antes de utilizar a melhoria por IA.");
      return;
    }
    if (!current.status) {
      setReportError("Selecione a classificação do item antes de melhorar a evidência.");
      return;
    }

    setReportError("");
    setImprovingEvidenceIds((ids) => ({ ...ids, [item.id]: true }));
    try {
      const response = await fetch(`/api/auditorias/${encodeURIComponent(auditId)}/evidencias/ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evidencias: [{
            perguntaId: item.id,
            resposta: current.status,
            evidenciaOriginal: current.evidence,
            observacao: current.observation,
            risco: current.risk
          }]
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível melhorar a evidência.");
      const suggestion = data.resultados?.[0]?.sugestao;
      if (!suggestion) throw new Error(data.resultados?.[0]?.error ?? "A IA não retornou uma sugestão.");
      update(item.id, { aiSuggestion: suggestion });
      setDirty(false);
      setDraftMessage("Sugestão da IA gerada. Revise e escolha a versão que entrará no relatório.");
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "Não foi possível melhorar a evidência.");
    } finally {
      setImprovingEvidenceIds((ids) => ({ ...ids, [item.id]: false }));
    }
  }

  async function improveAllEvidence() {
    if (!auditId || auditFinalized || improvingAllEvidence) return;
    const evidences = selectedItems
      .map((item) => ({ item, response: responses[item.id] }))
      .filter(({ response }) => Boolean(response?.status && response.evidence.trim()))
      .map(({ item, response }) => ({
        perguntaId: item.id,
        resposta: response.status,
        evidenciaOriginal: response.evidence,
        observacao: response.observation,
        risco: response.risk
      }));
    if (!evidences.length) {
      setReportError("Adicione ao menos uma evidência e selecione a classificação do item antes de melhorar todas.");
      return;
    }

    setReportError("");
    setImprovingAllEvidence(true);
    try {
      const response = await fetch(`/api/auditorias/${encodeURIComponent(auditId)}/evidencias/ia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evidencias: evidences })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível melhorar as evidências.");
      const suggestions = new Map<string, string>(
        (data.resultados ?? [])
          .filter((result: { perguntaId?: string; sugestao?: string }) => result.perguntaId && result.sugestao)
          .map((result: { perguntaId: string; sugestao: string }) => [result.perguntaId, result.sugestao])
      );
      setResponses((current) => Object.fromEntries(Object.entries(current).map(([id, item]) => [
        id,
        suggestions.has(id) ? { ...item, aiSuggestion: suggestions.get(id)! } : item
      ])));
      setDirty(false);
      const failures = (data.resultados ?? []).filter((result: { error?: string }) => result.error).length;
      setDraftMessage(
        failures
          ? "As sugestões disponíveis foram geradas; algumas evidências não puderam ser processadas. Revise cada item."
          : "Sugestões geradas. Revise cada evidência antes de finalizar a auditoria."
      );
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "Não foi possível melhorar as evidências.");
    } finally {
      setImprovingAllEvidence(false);
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
      await flushTextDrafts();
      if (Object.values(queuesRef.current).some((queue) => queue.value !== queue.confirmed)) {
        throw new Error("Há textos pendentes de salvamento. Aguarde a confirmação antes de finalizar.");
      }
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
      {Object.keys(recoveryDrafts).length ? (
        <section className="card" aria-live="polite">
          <strong>Encontramos {Object.keys(recoveryDrafts).length} rascunho(s) local(is) mais recente(s).</strong>
          <p className="muted">Esses textos não foram descartados. Você pode restaurá-los e sincronizá-los com o servidor.</p>
          <div className="button-row">
            <button className="button secondary" onClick={restoreLocalDrafts} type="button">Restaurar rascunhos</button>
            <button className="button secondary" onClick={() => setRecoveryDrafts({})} type="button">Manter versão salva</button>
          </div>
        </section>
      ) : null}
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
                  {item.itemNumber && !item.text.startsWith(item.itemNumber) ? `${item.itemNumber} ` : ""}{item.text}
                  <ChecklistQuestionInfo explanation={questionInfoText(item)} />
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
                <textarea
                  className="input textarea-autogrow"
                  data-autogrow="true"
                  disabled={auditFinalized}
                  id={`${item.id}-observation`}
                  rows={1}
                  value={responses[item.id]?.observation ?? ""}
                  onChange={(event) => {
                    updateText(item.id, "observation", event.target.value);
                    resizeTextarea(event.currentTarget);
                  }}
                  onBlur={() => scheduleTextDraft(item.id, "observation", responsesRef.current[item.id]?.observation ?? "", true)}
                />
                {fieldSync[fieldKey(item.id, "observation")] ? <small className="muted">{fieldSync[fieldKey(item.id, "observation")] === "saving" ? "Salvando..." : fieldSync[fieldKey(item.id, "observation")] === "saved" ? "Salvo automaticamente ✓" : fieldSync[fieldKey(item.id, "observation")] === "conflict" ? "Alterado em outra sessão. Revise antes de substituir." : fieldSync[fieldKey(item.id, "observation")] === "error" ? "Erro ao salvar. Tentaremos novamente." : "Alteração pendente"}</small> : null}
              </div>
              <div className="field field-wide">
                <label htmlFor={`${item.id}-evidence`}>Evidência original, se houver</label>
                <textarea
                  className="input textarea-autogrow"
                  data-autogrow="true"
                  disabled={auditFinalized}
                  id={`${item.id}-evidence`}
                  rows={1}
                  value={responses[item.id]?.evidence ?? ""}
                  onChange={(event) => {
                    // Alterar a evidência de origem exige uma nova revisão; uma sugestão
                    // baseada no texto anterior não pode ser reutilizada silenciosamente.
                    updateText(item.id, "evidence", event.target.value);
                    update(item.id, {
                      aiSuggestion: "",
                      finalEvidence: "",
                      finalEvidenceSource: ""
                    });
                    resizeTextarea(event.currentTarget);
                  }}
                  onBlur={() => scheduleTextDraft(item.id, "evidence", responsesRef.current[item.id]?.evidence ?? "", true)}
                />
                {fieldSync[fieldKey(item.id, "evidence")] ? <small className="muted">{fieldSync[fieldKey(item.id, "evidence")] === "saving" ? "Salvando..." : fieldSync[fieldKey(item.id, "evidence")] === "saved" ? "Salvo automaticamente ✓" : fieldSync[fieldKey(item.id, "evidence")] === "conflict" ? "Alterado em outra sessão. Revise antes de substituir." : fieldSync[fieldKey(item.id, "evidence")] === "error" ? "Erro ao salvar. Tentaremos novamente." : "Alteração pendente"}</small> : null}
                <div className="button-row" style={{ marginTop: 8 }}>
                  <button
                    className="button secondary"
                    disabled={auditFinalized || Boolean(improvingEvidenceIds[item.id])}
                    onClick={() => improveEvidence(item)}
                    type="button"
                  >
                    <Sparkles size={16} aria-hidden="true" />
                    {improvingEvidenceIds[item.id] ? "Melhorando redação..." : "Melhorar com IA"}
                  </button>
                </div>
                {responses[item.id]?.aiSuggestion ? (
                  <section className="card" style={{ marginTop: 12, background: "#f6fbff", boxShadow: "none" }} aria-label={`Revisão da sugestão de IA para ${item.text}`}>
                    <strong>✨ Sugestão de redação da IA</strong>
                    <p className="muted" style={{ margin: "6px 0" }}>Revise e edite livremente antes de escolher a versão final.</p>
                    <textarea
                      className="input textarea-autogrow"
                      data-autogrow="true"
                      disabled={auditFinalized}
                      id={`${item.id}-ai-evidence`}
                      rows={3}
                      value={responses[item.id]?.aiSuggestion ?? ""}
                      onChange={(event) => {
                        update(item.id, { aiSuggestion: event.target.value });
                        resizeTextarea(event.currentTarget);
                      }}
                    />
                    <div className="button-row" style={{ marginTop: 8 }}>
                      <button
                        className="button secondary"
                        disabled={auditFinalized}
                        onClick={() => update(item.id, {
                          finalEvidence: responses[item.id]?.aiSuggestion ?? "",
                          finalEvidenceSource: "ia"
                        })}
                        type="button"
                      >
                        Usar versão da IA
                      </button>
                      <button
                        className="button secondary"
                        disabled={auditFinalized}
                        onClick={() => update(item.id, {
                          finalEvidence: responses[item.id]?.evidence ?? "",
                          finalEvidenceSource: "original"
                        })}
                        type="button"
                      >
                        Manter original
                      </button>
                      <button
                        className="button secondary"
                        disabled={auditFinalized || Boolean(improvingEvidenceIds[item.id])}
                        onClick={() => improveEvidence(item)}
                        type="button"
                      >
                        Gerar novamente
                      </button>
                    </div>
                  </section>
                ) : null}
                {responses[item.id]?.finalEvidence ? (
                  <p className="muted" style={{ margin: "8px 0 0" }}>
                    ✨ Texto {responses[item.id]?.finalEvidenceSource === "original" ? "original confirmado" : "aprimorado com IA"} para o relatório.
                  </p>
                ) : null}
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
        {!auditFinalized ? (
          <div className="button-row" style={{ marginBottom: 12 }}>
            <button className="button secondary" disabled={improvingAllEvidence} onClick={improveAllEvidence} type="button">
              <Sparkles size={18} aria-hidden="true" />
              {improvingAllEvidence ? "Melhorando evidências..." : "Melhorar todas as evidências com IA"}
            </button>
            <span className="muted">As sugestões não entram no relatório sem sua aprovação.</span>
          </div>
        ) : null}
        {draftMessage ? <div className="badge success">{draftMessage}</div> : null}
        {reportError ? <div className="badge danger">{reportError}</div> : null}
        {lastReport ? (
          <div className="card" style={{ background: "#f6fbff", boxShadow: "none" }}>
            <strong>Relatório gerado: {lastReport.auditCode}</strong>
            <p className="muted">
              Resultado: {lastReport.result} | Conformidade: {lastReport.compliancePercentage}%
            </p>
            {lastReport.metrics ? (
              <div className="grid grid-4" style={{ margin: "12px 0" }}>
                <div>Total avaliado: <strong>{lastReport.metrics.totalItems}</strong></div>
                <div>Conformes: <strong>{lastReport.metrics.conformingItems}</strong></div>
                <div>Não conformes: <strong>{lastReport.metrics.nonConformingItems}</strong></div>
                <div>Não aplicáveis: <strong>{lastReport.metrics.notApplicableItems}</strong></div>
                <div>Conformidade: <strong>{lastReport.metrics.compliancePercentage}%</strong></div>
                <div>Não conformidade: <strong>{lastReport.metrics.nonCompliancePercentage}%</strong></div>
                <div>Itens aplicáveis: <strong>{lastReport.metrics.applicableItems}</strong></div>
                <div>Resultado: <strong>{lastReport.metrics.result}</strong></div>
              </div>
            ) : null}
            <div className="button-row">
              <a className="button secondary" href={lastReport.viewUrl} target="_blank" rel="noreferrer">
                Ver relatório
              </a>
              <a className="button secondary" href={lastReport.downloadUrl}>
                Baixar PDF
              </a>
              <button className="button secondary" onClick={() => window.open(`/api/reports/${lastReport.id}/html?print=1`, "_blank", "noopener,noreferrer")} type="button">
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
          {!auditFinalized ? <Link className="button secondary" href="/audits/new#auditorias-nao-finalizadas">Ver não finalizadas</Link> : null}
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
