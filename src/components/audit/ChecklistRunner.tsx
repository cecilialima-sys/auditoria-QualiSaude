"use client";

import { useMemo, useState } from "react";
import { FileDown, Save, Send } from "lucide-react";
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

  function update(id: string, patch: Partial<ResponseState>) {
    setResponses((current) => ({
      ...current,
      [id]: { ...current[id], ...patch }
    }));
  }

  return (
    <div className="grid">
      <section className="card" aria-labelledby="checklist-progress-title">
        <h2 className="section-title" id="checklist-progress-title">Resumo do checklist</h2>
        <div className="field" style={{ marginBottom: 16 }}>
          <label htmlFor="checklist-area">Area/setor do checklist</label>
          <select
            className="input"
            id="checklist-area"
            value={selectedGroupId}
            onChange={(event) => {
              setSelectedGroupId(event.target.value);
              setSigned(false);
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
            <div className="muted">Classificacao</div>
            <span className={`badge ${compliance.classification === "Critico" ? "danger" : compliance.classification === "Atencao" ? "warning" : "success"}`}>
              {compliance.classification}
            </span>
          </article>
          <article>
            <div className="muted">Itens aplicaveis</div>
            <div className="metric-value">{compliance.applicable}</div>
          </article>
        </div>
        <div className="progress" style={{ marginTop: 14 }}>
          <span style={{ width: `${progress}%` }} />
        </div>
      </section>

      <section className="card" aria-labelledby="audit-identification-title">
        <h2 className="section-title" id="audit-identification-title">Identificacao da auditoria</h2>
        <div className="grid grid-3">
          <div className="field">
            <label htmlFor="audit-sector">Setor auditado</label>
            <input className="input" id="audit-sector" placeholder="Setor auditado" value={selectedGroup?.category ?? ""} readOnly />
          </div>
          <div className="field">
            <label htmlFor="audit-auditor">Auditor</label>
            <input className="input" id="audit-auditor" placeholder="Nome do auditor" />
          </div>
          <div className="field">
            <label htmlFor="audit-manager">Responsavel pelo setor</label>
            <input className="input" id="audit-manager" placeholder="Responsavel pelo setor" />
          </div>
          <div className="field">
            <label htmlFor="audit-date">Data</label>
            <input className="input" id="audit-date" type="date" />
          </div>
          <div className="field">
            <label htmlFor="audit-type">Tipo de auditoria</label>
            <select className="input" id="audit-type" defaultValue="">
              <option value="" disabled>Selecione o tipo</option>
              {auditTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="audit-final-status">Status final</label>
            <select className="input" id="audit-final-status" defaultValue="Em andamento">
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
                  <label htmlFor={`${item.id}-deadline`}>Prazo para correcao</label>
                  <input className="input" id={`${item.id}-deadline`} type="date" value={responses[item.id].deadline} onChange={(event) => update(item.id, { deadline: event.target.value })} />
                </div>
                <div className="field field-wide">
                  <label htmlFor={`${item.id}-observation`}>Observacao do auditor</label>
                  <input className="input" id={`${item.id}-observation`} value={responses[item.id].observation} onChange={(event) => update(item.id, { observation: event.target.value })} />
                </div>
              </div>
            </article>
          ))
        ) : (
          <article className="card empty-state">
            <h3>Nenhum checklist cadastrado</h3>
            <p className="muted">
              A estrutura da tela esta pronta. Os checklists devem ser adicionados em `src/lib/checklists/checklist-template.ts`, organizados por setor, categoria, pergunta, criterio e explicacao.
            </p>
          </article>
        )}
      </section>

      <section className="card" aria-labelledby="automatic-report-title">
        <h2 className="section-title" id="automatic-report-title">Relatorio automatico</h2>
        <div className="grid grid-4">
          <div>Conformes: <strong>{counts["Conforme"] ?? 0}</strong></div>
          <div>Nao conformes: <strong>{counts["Nao conforme"] ?? 0}</strong></div>
          <div>Nao aplicaveis: <strong>{counts["Nao se aplica"] ?? 0}</strong></div>
        </div>
        <p>{intelligentConclusion(compliance.classification)}</p>
        <label className="inline-check">
          <input checked={signed} onChange={(event) => setSigned(event.target.checked)} type="checkbox" />
          Confirmo digitalmente a finalizacao desta auditoria.
        </label>
        <div className="button-row">
          <button className="button secondary" type="button">
            <Save size={18} aria-hidden="true" />
            Salvar progresso
          </button>
          <a className="button secondary" href="/api/exports/pdf">
            <FileDown size={18} aria-hidden="true" />
            Exportar PDF
          </a>
          <a className="button secondary" href="/api/exports/excel">
            <FileDown size={18} aria-hidden="true" />
            Exportar Excel
          </a>
          <button className="button" disabled={!signed || !totalItems} type="button">
            <Send size={18} aria-hidden="true" />
            Finalizar auditoria
          </button>
        </div>
      </section>
    </div>
  );
}
