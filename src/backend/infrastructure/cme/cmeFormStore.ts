import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { getPrismaClient } from "@/backend/infrastructure/database/prismaClient";
import { cmeEquipments, cmeIndicators, cmeNonConformities, cmeProcesses, type CmeFormInput, type CmeFormRecord } from "@/lib/cme/cmeForm";
export { cmeEquipments, cmeIndicators, cmeNonConformities, cmeProcesses, type CmeFormInput, type CmeFormRecord } from "@/lib/cme/cmeForm";

const storePath = process.env.CME_FORM_STORE_PATH ? resolve(process.env.CME_FORM_STORE_PATH) : join(process.cwd(), "data", "cme-forms.json");
const state = globalThis as typeof globalThis & { cmeForms?: CmeFormRecord[]; cmePrismaUnavailable?: boolean };

function optional(value?: string) { return value?.trim() || undefined; }
function isTime(value?: string) { return Boolean(value && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)); }
function dateValue(value?: string) { return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined; }

function validate(input: CmeFormInput): Omit<CmeFormRecord, "id" | "createdAt" | "updatedAt" | "status"> {
  const required: Array<[keyof CmeFormInput, string]> = [["recordDate", "Data"], ["recordTime", "Hora"], ["responsible", "Responsável"], ["sector", "Setor"], ["unit", "Unidade"], ["recordType", "Tipo de registro"], ["process", "Processo"], ["equipment", "Equipamento"], ["materialName", "Nome do material"], ["quantity", "Quantidade"], ["chemicalIndicator", "Indicador químico"], ["biologicalIndicator", "Indicador biológico"], ["bowieDickTest", "Teste Bowie Dick"], ["signerName", "Nome do responsável pela assinatura"], ["signerRole", "Cargo"], ["signatureDate", "Data da assinatura"], ["signatureTime", "Hora da assinatura"]];
  for (const [key, label] of required) if (!String(input[key] ?? "").trim()) throw new Error(`${label} é obrigatório.`);
  if (!dateValue(input.recordDate) || !dateValue(input.signatureDate)) throw new Error("Informe datas válidas.");
  if (!isTime(input.recordTime) || !isTime(input.signatureTime)) throw new Error("Informe horários válidos no formato HH:MM.");
  if (!cmeProcesses.includes(input.process as typeof cmeProcesses[number])) throw new Error("Processo inválido.");
  if (!cmeEquipments.includes(input.equipment as typeof cmeEquipments[number])) throw new Error("Equipamento inválido.");
  if (input.equipment === "Outro" && !optional(input.equipmentOtherDescription)) throw new Error("Descreva o equipamento informado como Outro.");
  const quantity = Number(input.quantity);
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error("Quantidade deve ser um número inteiro maior que zero.");
  for (const indicator of [input.chemicalIndicator, input.biologicalIndicator, input.bowieDickTest]) if (!cmeIndicators.includes(indicator as typeof cmeIndicators[number])) throw new Error("Indicador inválido.");
  const nonConformities = Array.isArray(input.nonConformities) ? input.nonConformities.filter((item) => cmeNonConformities.includes(item as typeof cmeNonConformities[number])) : [];
  if ((input.nonConformities?.length ?? 0) !== nonConformities.length) throw new Error("Não conformidade inválida.");
  if (nonConformities.includes("Outro") && !optional(input.nonConformityOther)) throw new Error("Descreva a não conformidade informada como Outro.");
  return { ...input, recordDate: input.recordDate!, recordTime: input.recordTime!, responsible: input.responsible!.trim(), sector: input.sector!.trim(), unit: input.unit!.trim(), recordType: input.recordType!.trim(), process: input.process!, equipment: input.equipment!, equipmentOtherDescription: optional(input.equipmentOtherDescription), materialName: input.materialName!.trim(), materialCode: optional(input.materialCode), quantity, lot: optional(input.lot), materialNotes: optional(input.materialNotes), chemicalIndicator: input.chemicalIndicator!, biologicalIndicator: input.biologicalIndicator!, bowieDickTest: input.bowieDickTest!, nonConformities, nonConformityOther: optional(input.nonConformityOther), generalNotes: optional(input.generalNotes), signerName: input.signerName!.trim(), signerRole: input.signerRole!.trim(), signatureDate: input.signatureDate!, signatureTime: input.signatureTime! };
}

function readLocal() { if (!state.cmeForms) { try { state.cmeForms = existsSync(storePath) ? JSON.parse(readFileSync(storePath, "utf8")) : []; } catch { state.cmeForms = []; } } return state.cmeForms; }
function saveLocal() { mkdirSync(dirname(storePath), { recursive: true }); writeFileSync(storePath, JSON.stringify(readLocal(), null, 2)); }
function serialize(row: any): CmeFormRecord { return { id: row.id, recordDate: new Date(row.recordDate).toISOString().slice(0, 10), recordTime: row.recordTime, responsible: row.responsible, sector: row.sector, unit: row.unit, recordType: row.recordType, process: row.process, equipment: row.equipment, equipmentOtherDescription: row.equipmentOtherDescription ?? undefined, materialName: row.materialName, materialCode: row.materialCode ?? undefined, quantity: row.quantity, lot: row.lot ?? undefined, materialNotes: row.materialNotes ?? undefined, chemicalIndicator: row.chemicalIndicator, biologicalIndicator: row.biologicalIndicator, bowieDickTest: row.bowieDickTest, nonConformities: Array.isArray(row.nonConformities) ? row.nonConformities : [], nonConformityOther: row.nonConformityOther ?? undefined, generalNotes: row.generalNotes ?? undefined, signerName: row.signerName, signerRole: row.signerRole, signatureDate: new Date(row.signatureDate).toISOString().slice(0, 10), signatureTime: row.signatureTime, createdAt: new Date(row.createdAt).toISOString(), updatedAt: new Date(row.updatedAt).toISOString(), status: "Registrado" }; }
async function prisma<T>(operation: (client: ReturnType<typeof getPrismaClient>) => Promise<T>) { if (state.cmePrismaUnavailable) return null; try { return await operation(getPrismaClient()); } catch (error) { state.cmePrismaUnavailable = true; console.error("[cme] Prisma indisponível; usando armazenamento local.", error); return null; } }

export async function listCmeForms() { const rows = await prisma((client) => (client as any).cmeForm.findMany({ orderBy: { recordDate: "desc" } })); return rows ? rows.map(serialize) : readLocal().slice().sort((a, b) => b.recordDate.localeCompare(a.recordDate)); }
export async function getCmeForm(id: string) { const row = await prisma((client) => (client as any).cmeForm.findUnique({ where: { id } })); return row ? serialize(row) : readLocal().find((item) => item.id === id) ?? null; }
export async function createCmeForm(input: CmeFormInput) { const data = validate(input); const row = await prisma((client) => (client as any).cmeForm.create({ data: { ...data, recordDate: new Date(`${data.recordDate}T12:00:00`), signatureDate: new Date(`${data.signatureDate}T12:00:00`) } })); if (row) return serialize(row); const now = new Date().toISOString(); const record: CmeFormRecord = { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now, status: "Registrado" }; readLocal().unshift(record); saveLocal(); return record; }
export async function updateCmeForm(id: string, input: CmeFormInput) { const data = validate(input); const row = await prisma((client) => (client as any).cmeForm.update({ where: { id }, data: { ...data, recordDate: new Date(`${data.recordDate}T12:00:00`), signatureDate: new Date(`${data.signatureDate}T12:00:00`) } })); if (row) return serialize(row); const record = readLocal().find((item) => item.id === id); if (!record) return null; Object.assign(record, data, { updatedAt: new Date().toISOString() }); saveLocal(); return record; }
export async function deleteCmeForm(id: string) { const result = await prisma((client) => (client as any).cmeForm.deleteMany({ where: { id } })); if (result) return result.count === 1; const index = readLocal().findIndex((item) => item.id === id); if (index < 0) return false; readLocal().splice(index, 1); saveLocal(); return true; }
