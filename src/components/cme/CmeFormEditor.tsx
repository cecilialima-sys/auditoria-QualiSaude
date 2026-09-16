"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleHelp, Save } from "lucide-react";
import { cmeChecklistClassifications, cmeChecklistItems, type CmeChecklistResponse, type CmeFormInput, type CmeFormRecord } from "@/lib/cme/cmeForm";

const today = new Date().toISOString().slice(0, 10);
const now = new Date().toTimeString().slice(0, 5);
const blank: CmeFormInput = {
  recordDate: today, recordTime: now, responsible: "", sector: "CME - Central de Material e Esterilização", unit: "", recordType: "Auditoria de conformidade",
  process: "Processamento de Produtos para Saúde", equipment: "Não aplicável", materialName: "Checklist 4.4 - Processamento de Produtos para Saúde", quantity: 1,
  chemicalIndicator: "Não Aplicável", biologicalIndicator: "Não Aplicável", bowieDickTest: "Não Aplicável", nonConformities: [],
  generalNotes: "", signerName: "", signerRole: "", signatureDate: today, signatureTime: now, checklistResponses: []
};

export function CmeFormEditor({ record }: { record?: CmeFormRecord }) {
  const router = useRouter();
  const [form, setForm] = useState<CmeFormInput>(() => ({ ...blank, ...record, checklistResponses: record?.checklistResponses ?? [] }));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const answersByQuestion = useMemo(() => new Map((form.checklistResponses ?? []).map((response) => [response.questionId, response])), [form.checklistResponses]);
  const requiredMissing = useMemo(() => !form.recordDate || !form.recordTime || !form.responsible || !form.unit || !form.signerName || !form.signerRole || !form.signatureDate || !form.signatureTime || cmeChecklistItems.some((item) => !answersByQuestion.get(item.id)?.classification), [answersByQuestion, form]);
  const change = (key: keyof CmeFormInput, value: string) => setForm((current) => ({ ...current, [key]: value }));

  function changeAnswer(questionId: string, patch: Partial<CmeChecklistResponse>) {
    setForm((current) => {
      const answers = current.checklistResponses ?? [];
      const existing = answers.find((answer) => answer.questionId === questionId);
      const next = { questionId, classification: existing?.classification ?? "Conforme", evidence: existing?.evidence ?? "", ...patch } as CmeChecklistResponse;
      return { ...current, checklistResponses: existing ? answers.map((answer) => answer.questionId === questionId ? next : answer) : [...answers, next] };
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(""); setNotice("");
    if (requiredMissing) { setError("Preencha os dados obrigatórios e classifique todos os 27 requisitos antes de salvar."); return; }
    setSaving(true);
    try {
      const response = await fetch(record ? `/api/cme/formularios/${record.id}` : "/api/cme/formularios", { method: record ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível salvar o checklist CME.");
      setNotice("Checklist CME salvo com sucesso."); router.push(`/cme/${payload.id}?saved=1`); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar o checklist CME."); }
    finally { setSaving(false); }
  }

  return <form className="grid" onSubmit={submit}>
    <section className="card"><h2 style={{ marginTop: 0 }}>Dados da auditoria</h2><p className="muted">Lista de verificação 4.4 — Processamento de Produtos para Saúde, conforme Manual ONA versão 2022.</p><div className="grid grid-3">
      <Field label="Data" required><input className="input" type="date" value={form.recordDate} onChange={(event) => change("recordDate", event.target.value)} /></Field>
      <Field label="Hora" required><input className="input" type="time" value={form.recordTime} onChange={(event) => change("recordTime", event.target.value)} /></Field>
      <Field label="Auditor líder" required><input className="input" value={form.responsible} onChange={(event) => change("responsible", event.target.value)} /></Field>
      <Field label="Setor"><input className="input" value={form.sector} readOnly /></Field>
      <Field label="Unidade" required><input className="input" value={form.unit} onChange={(event) => change("unit", event.target.value)} /></Field>
    </div></section>

    <section className="card"><h2 style={{ marginTop: 0 }}>Requisitos de nível 1</h2><p className="muted">Selecione uma única classificação para cada requisito e registre a evidência observada.</p><div className="grid">
      {cmeChecklistItems.map((item) => {
        const answer = answersByQuestion.get(item.id);
        return <article className="card" key={item.id} style={{ boxShadow: "none", border: "1px solid var(--border, #dbe4ef)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}><strong>{item.number}.</strong><div style={{ flex: 1 }}><strong>{item.requirement}</strong>
            <details style={{ marginTop: 8 }}><summary aria-label={`Ver orientação do requisito ${item.number}`} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}><CircleHelp size={17} aria-hidden="true" />Orientações e evidências sugeridas</summary>
              <p className="muted" style={{ marginBottom: 4 }}><strong>Orientação:</strong> {item.guidance}</p><p className="muted"><strong>Evidência sugerida:</strong> {item.evidenceSuggestion}</p>
            </details>
          </div></div>
          <div className="button-row" style={{ marginTop: 14 }} role="radiogroup" aria-label={`Classificação do requisito ${item.number}`}>
            {cmeChecklistClassifications.map((classification) => <label className="button secondary" key={classification} style={{ cursor: "pointer" }}><input checked={answer?.classification === classification} name={`classification-${item.id}`} onChange={() => changeAnswer(item.id, { classification })} style={{ marginRight: 7 }} type="radio" value={classification} />{classification}</label>)}
          </div>
          <Field label="Evidência / constatação"><textarea className="input" rows={3} value={answer?.evidence ?? ""} onChange={(event) => changeAnswer(item.id, { evidence: event.target.value })} /></Field>
        </article>;
      })}
    </div></section>

    <section className="card"><h2 style={{ marginTop: 0 }}>Observações e assinatura</h2><div className="grid grid-3">
      <Field label="Observações gerais"><textarea className="input" rows={4} value={form.generalNotes} onChange={(event) => change("generalNotes", event.target.value)} /></Field>
      <Field label="Nome do responsável" required><input className="input" value={form.signerName} onChange={(event) => change("signerName", event.target.value)} /></Field>
      <Field label="Cargo" required><input className="input" value={form.signerRole} onChange={(event) => change("signerRole", event.target.value)} /></Field>
      <Field label="Data da assinatura" required><input className="input" type="date" value={form.signatureDate} onChange={(event) => change("signatureDate", event.target.value)} /></Field>
      <Field label="Hora da assinatura" required><input className="input" type="time" value={form.signatureTime} onChange={(event) => change("signatureTime", event.target.value)} /></Field>
    </div></section>
    {error ? <div className="badge danger" role="alert">{error}</div> : null}{notice ? <div className="badge success" role="status">{notice}</div> : null}
    <div className="button-row"><button className="button" disabled={saving} type="submit"><Save size={18} />{saving ? "Salvando..." : "Salvar checklist"}</button></div>
  </form>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <div className="field"><label>{label}{required ? " *" : ""}</label>{children}</div>; }
