"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import type { CmeFormRecord } from "@/lib/cme/cmeForm";

export function CmeFormsList() {
  const [forms, setForms] = useState<CmeFormRecord[]>([]); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(""); const [sector, setSector] = useState(""); const [responsible, setResponsible] = useState(""); const [process, setProcess] = useState(""); const [date, setDate] = useState(""); const [page, setPage] = useState(1); const pageSize = 10;
  useEffect(() => { fetch("/api/cme/formularios").then(async (response) => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error); setForms(payload.formularios); }).catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível carregar os formulários CME.")).finally(() => setLoading(false)); }, []);
  const filtered = useMemo(() => forms.filter((item) => (!query || [item.materialName, item.responsible, item.sector, item.process].join(" ").toLowerCase().includes(query.toLowerCase())) && (!sector || item.sector === sector) && (!responsible || item.responsible === responsible) && (!process || item.process === process) && (!date || item.recordDate === date)), [forms, query, sector, responsible, process, date]);
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize); const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  return <>
    <div className="card" style={{ marginBottom: 16 }}><div className="grid grid-3">
      <div className="field"><label>Buscar</label><div style={{ position: "relative" }}><Search aria-hidden="true" size={17} style={{ left: 10, position: "absolute", top: 11 }} /><input className="input" style={{ paddingLeft: 34 }} value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Material, responsável, setor..." /></div></div>
      <Filter label="Data" value={date} onChange={setDate} options={Array.from(new Set(forms.map((item) => item.recordDate)))} />
      <Filter label="Setor" value={sector} onChange={setSector} options={Array.from(new Set(forms.map((item) => item.sector)))} />
      <Filter label="Responsável" value={responsible} onChange={setResponsible} options={Array.from(new Set(forms.map((item) => item.responsible)))} />
      <Filter label="Processo" value={process} onChange={setProcess} options={Array.from(new Set(forms.map((item) => item.process)))} />
    </div></div>
    {error ? <div className="badge danger" role="alert">{error}</div> : null}
    <div className="card table-wrap"><table><thead><tr><th>Data</th><th>Responsável</th><th>Setor</th><th>Processo</th><th>Status</th><th aria-label="Ações" /></tr></thead><tbody>{loading ? <tr><td className="muted" colSpan={6}>Carregando formulários...</td></tr> : pageItems.length ? pageItems.map((item) => <tr key={item.id}><td>{new Date(`${item.recordDate}T12:00:00`).toLocaleDateString("pt-BR")}</td><td>{item.responsible}</td><td>{item.sector}</td><td>{item.process}</td><td><span className="badge success">{item.status}</span></td><td><Link className="button secondary" href={`/cme/${item.id}`}>Ver</Link></td></tr>) : <tr><td className="muted" colSpan={6}>Nenhum formulário encontrado.</td></tr>}</tbody></table>
      <div className="button-row" style={{ justifyContent: "space-between", marginTop: 18 }}><span className="muted">{filtered.length} registro(s)</span><div className="button-row"><button className="button secondary" disabled={page === 1} onClick={() => setPage(page - 1)} type="button">Anterior</button><span className="muted">Página {page} de {pages}</span><button className="button secondary" disabled={page === pages} onClick={() => setPage(page + 1)} type="button">Próxima</button></div></div>
    </div>
  </>;
}
function Filter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <div className="field"><label>{label}</label><select className="input" value={value} onChange={(e) => onChange(e.target.value)}><option value="">Todos</option>{options.sort().map((option) => <option key={option}>{option}</option>)}</select></div>; }
export function CmeListHeader() { return <Link className="button" href="/cme/new"><Plus size={18} />Novo formulário</Link>; }
