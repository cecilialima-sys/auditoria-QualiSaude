"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { cmeEquipments, cmeIndicators, cmeNonConformities, cmeProcesses, type CmeFormInput, type CmeFormRecord } from "@/lib/cme/cmeForm";

const today = new Date().toISOString().slice(0, 10);
const now = new Date().toTimeString().slice(0, 5);
const blank: CmeFormInput = { recordDate: today, recordTime: now, responsible: "", sector: "CME - Central de Material e Esterilização", unit: "", recordType: "Rotina", process: "", equipment: "", materialName: "", materialCode: "", quantity: "", lot: "", materialNotes: "", chemicalIndicator: "", biologicalIndicator: "", bowieDickTest: "", nonConformities: [], nonConformityOther: "", generalNotes: "", signerName: "", signerRole: "", signatureDate: today, signatureTime: now };

export function CmeFormEditor({ record }: { record?: CmeFormRecord }) {
  const router = useRouter();
  const [form, setForm] = useState<CmeFormInput>(record ?? blank);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const isOtherEquipment = form.equipment === "Outro";
  const hasOtherNonConformity = form.nonConformities?.includes("Outro");
  const requiredMissing = useMemo(() => !form.recordDate || !form.recordTime || !form.responsible || !form.unit || !form.recordType || !form.process || !form.equipment || !form.materialName || !form.quantity || !form.chemicalIndicator || !form.biologicalIndicator || !form.bowieDickTest || !form.signerName || !form.signerRole || !form.signatureDate || !form.signatureTime, [form]);
  const change = (key: keyof CmeFormInput, value: string | string[]) => setForm((current) => ({ ...current, [key]: value }));
  const toggleNonConformity = (value: string) => setForm((current) => ({ ...current, nonConformities: current.nonConformities?.includes(value) ? current.nonConformities.filter((item) => item !== value) : [...(current.nonConformities ?? []), value] }));

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(""); setNotice("");
    if (requiredMissing) { setError("Preencha todos os campos obrigatórios antes de salvar."); return; }
    setSaving(true);
    try {
      const response = await fetch(record ? `/api/cme/formularios/${record.id}` : "/api/cme/formularios", { method: record ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível salvar o formulário CME.");
      setNotice("Formulário CME salvo com sucesso.");
      router.push(`/cme/${payload.id}?saved=1`); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar o formulário CME."); }
    finally { setSaving(false); }
  }

  return <form className="card" onSubmit={submit}>
    <section><h2 style={{ marginTop: 0 }}>Dados do registro</h2><div className="grid grid-3">
      <Field label="Data" required><input className="input" type="date" value={form.recordDate} onChange={(e) => change("recordDate", e.target.value)} /></Field>
      <Field label="Hora" required><input className="input" type="time" value={form.recordTime} onChange={(e) => change("recordTime", e.target.value)} /></Field>
      <Field label="Responsável" required><input className="input" value={form.responsible} onChange={(e) => change("responsible", e.target.value)} /></Field>
      <Field label="Setor" required><input className="input" value={form.sector} onChange={(e) => change("sector", e.target.value)} /></Field>
      <Field label="Unidade" required><input className="input" value={form.unit} onChange={(e) => change("unit", e.target.value)} /></Field>
      <Field label="Tipo de registro" required><input className="input" placeholder="Ex.: Rotina, ocorrência ou monitoramento" value={form.recordType} onChange={(e) => change("recordType", e.target.value)} /></Field>
    </div></section>
    <section style={{ marginTop: 28 }}><h2>Processo e material</h2><div className="grid grid-3">
      <Select label="Processo" required value={form.process} options={cmeProcesses} onChange={(value) => change("process", value)} />
      <Select label="Equipamento" required value={form.equipment} options={cmeEquipments} onChange={(value) => change("equipment", value)} />
      {isOtherEquipment ? <Field label="Descrição do equipamento" required><input className="input" value={form.equipmentOtherDescription} onChange={(e) => change("equipmentOtherDescription", e.target.value)} /></Field> : <div />}
      <Field label="Nome do material" required><input className="input" value={form.materialName} onChange={(e) => change("materialName", e.target.value)} /></Field>
      <Field label="Código"><input className="input" value={form.materialCode} onChange={(e) => change("materialCode", e.target.value)} /></Field>
      <Field label="Quantidade" required><input className="input" min="1" type="number" value={form.quantity} onChange={(e) => change("quantity", e.target.value)} /></Field>
      <Field label="Lote"><input className="input" value={form.lot} onChange={(e) => change("lot", e.target.value)} /></Field>
      <Field label="Observações do material"><input className="input" value={form.materialNotes} onChange={(e) => change("materialNotes", e.target.value)} /></Field>
    </div></section>
    <section style={{ marginTop: 28 }}><h2>Indicadores</h2><div className="grid grid-3">
      <Select label="Indicador químico" required value={form.chemicalIndicator} options={cmeIndicators} onChange={(value) => change("chemicalIndicator", value)} />
      <Select label="Indicador biológico" required value={form.biologicalIndicator} options={cmeIndicators} onChange={(value) => change("biologicalIndicator", value)} />
      <Select label="Teste Bowie Dick" required value={form.bowieDickTest} options={cmeIndicators} onChange={(value) => change("bowieDickTest", value)} />
    </div></section>
    <section style={{ marginTop: 28 }}><h2>Não conformidades</h2><div className="grid grid-3">{cmeNonConformities.map((item) => <label key={item} className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><input checked={form.nonConformities?.includes(item)} onChange={() => toggleNonConformity(item)} type="checkbox" />{item}</label>)}</div>
      {hasOtherNonConformity ? <Field label="Descrição da não conformidade" required><input className="input" value={form.nonConformityOther} onChange={(e) => change("nonConformityOther", e.target.value)} /></Field> : null}
      <Field label="Observações gerais"><textarea className="input" rows={4} value={form.generalNotes} onChange={(e) => change("generalNotes", e.target.value)} /></Field>
    </section>
    <section style={{ marginTop: 28 }}><h2>Assinatura</h2><div className="grid grid-3">
      <Field label="Nome do responsável" required><input className="input" value={form.signerName} onChange={(e) => change("signerName", e.target.value)} /></Field>
      <Field label="Cargo" required><input className="input" value={form.signerRole} onChange={(e) => change("signerRole", e.target.value)} /></Field>
      <Field label="Data" required><input className="input" type="date" value={form.signatureDate} onChange={(e) => change("signatureDate", e.target.value)} /></Field>
      <Field label="Hora" required><input className="input" type="time" value={form.signatureTime} onChange={(e) => change("signatureTime", e.target.value)} /></Field>
    </div></section>
    {error ? <div className="badge danger" role="alert" style={{ marginTop: 18 }}>{error}</div> : null}{notice ? <div className="badge success" role="status" style={{ marginTop: 18 }}>{notice}</div> : null}
    <div className="button-row" style={{ marginTop: 24 }}><button className="button" disabled={saving} type="submit"><Save size={18} />{saving ? "Salvando..." : "Salvar formulário"}</button></div>
  </form>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <div className="field"><label>{label}{required ? " *" : ""}</label>{children}</div>; }
function Select({ label, required, value, options, onChange }: { label: string; required?: boolean; value?: string; options: readonly string[]; onChange: (value: string) => void }) { return <Field label={label} required={required}><select className="input" value={value} onChange={(e) => onChange(e.target.value)}><option value="">Selecione</option>{options.map((option) => <option key={option}>{option}</option>)}</select></Field>; }
