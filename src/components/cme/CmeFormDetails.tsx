"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { cmeChecklistItems, type CmeFormRecord } from "@/lib/cme/cmeForm";

export function CmeFormDetails({ record, saved }: { record: CmeFormRecord; saved?: boolean }) {
  const router = useRouter(); const [error, setError] = useState(""); const [deleting, setDeleting] = useState(false);
  const responses = new Map((record.checklistResponses ?? []).map((response) => [response.questionId, response]));
  async function remove() { if (!window.confirm("Excluir este checklist CME? Esta ação não poderá ser desfeita.")) return; setDeleting(true); setError(""); try { const response = await fetch(`/api/cme/formularios/${record.id}`, { method: "DELETE" }); if (!response.ok) { const data = await response.json(); throw new Error(data.error); } router.push("/cme"); router.refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível excluir o checklist."); setDeleting(false); } }
  return <>{saved ? <div className="badge success" role="status" style={{ marginBottom: 16 }}>Checklist CME salvo com sucesso.</div> : null}
    <section className="card"><dl className="details-list"><div><dt>Data e hora</dt><dd>{new Date(`${record.recordDate}T12:00:00`).toLocaleDateString("pt-BR")} às {record.recordTime}</dd></div><div><dt>Auditor líder</dt><dd>{record.responsible}</dd></div><div><dt>Setor / Unidade</dt><dd>{record.sector} / {record.unit}</dd></div><div><dt>Observações</dt><dd>{record.generalNotes || "Não informadas"}</dd></div></dl></section>
    <section className="grid" style={{ marginTop: 18 }}>{cmeChecklistItems.map((item) => { const answer = responses.get(item.id); return <article className="card" key={item.id}><p className="muted">Requisito {item.number} · <strong>{answer?.classification ?? "Não respondido"}</strong></p><h3>{item.requirement}</h3><p><strong>Evidência / constatação</strong><br />{answer?.evidence || "Não registrada"}</p></article>; })}</section>
    {error ? <div className="badge danger" role="alert" style={{ marginTop: 16 }}>{error}</div> : null}<div className="button-row" style={{ marginTop: 20 }}><Link className="button secondary" href={`/cme/${record.id}/edit`}>Editar</Link><button className="button danger" disabled={deleting} onClick={remove} type="button"><Trash2 size={18} />{deleting ? "Excluindo..." : "Excluir"}</button></div>
  </>;
}
