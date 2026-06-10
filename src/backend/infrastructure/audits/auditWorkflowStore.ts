import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import type { AccessUser } from "@/backend/infrastructure/auth/accessStore";
import { getPrismaClient } from "@/backend/infrastructure/database/prismaClient";
import { checklistTemplateGroups, type ChecklistGroup } from "@/lib/checklists/checklist-template";

export type AuditWorkflowStatusApi = "rascunho" | "em_andamento" | "finalizada" | "sincronizacao_pendente" | "cancelada";

export type AuditWorkflowRecord = {
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
  status: AuditWorkflowStatusApi;
  dataInicio: string;
  dataFinalizacao?: string;
  percentualConformidade?: number;
  parecerFinal?: string;
  createdAt: string;
  updatedAt: string;
};

export type AuditWorkflowResponseRecord = {
  id: string;
  auditoriaId: string;
  checklistId: string;
  perguntaId: string;
  resposta: string;
  status: string;
  observacao?: string;
  evidencia?: string;
  risco?: string;
  idLocal?: string;
  sincronizado: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateAuditWorkflowInput = {
  setor?: string;
  responsavelSetor?: string;
  checklistId?: string;
  tipoAuditoria?: string;
  observacoesIniciais?: string;
};

export type SaveAuditWorkflowResponseInput = {
  perguntaId?: string;
  resposta?: string;
  status?: string;
  observacao?: string;
  evidencia?: string;
  risco?: string;
  idLocal?: string;
  sincronizado?: boolean;
};

type PersistedAuditWorkflowStore = {
  auditorias: AuditWorkflowRecord[];
  respostas: AuditWorkflowResponseRecord[];
  logs: AuditWorkflowLog[];
};

type AuditWorkflowLog = {
  id: string;
  auditoriaId: string;
  actorId: string;
  actorEmail: string;
  action: "AUDIT_CREATED" | "RESPONSES_SAVED" | "AUDIT_FINALIZED";
  createdAt: string;
  ip?: string;
};

const globalState = globalThis as typeof globalThis & {
  qualisaudeAuditWorkflowStore?: PersistedAuditWorkflowStore;
  qualisaudeAuditWorkflowPrismaUnavailable?: boolean;
};

const dataDir = process.env.DATA_DIR ? resolve(process.env.DATA_DIR) : join(process.cwd(), "data");
const storePath = process.env.AUDIT_WORKFLOW_STORE_PATH
  ? resolve(process.env.AUDIT_WORKFLOW_STORE_PATH)
  : join(dataDir, "audit-workflow-store.json");

const statusToDb: Record<AuditWorkflowStatusApi, string> = {
  rascunho: "DRAFT",
  em_andamento: "IN_PROGRESS",
  finalizada: "COMPLETED",
  sincronizacao_pendente: "SYNC_PENDING",
  cancelada: "CANCELED"
};

const statusFromDb: Record<string, AuditWorkflowStatusApi> = {
  DRAFT: "rascunho",
  IN_PROGRESS: "em_andamento",
  COMPLETED: "finalizada",
  SYNC_PENDING: "sincronizacao_pendente",
  CANCELED: "cancelada"
};

const allowedAnswers = new Set(["Conforme", "Não conforme", "Não se aplica"]);

function readPersistedStore(): PersistedAuditWorkflowStore {
  if (!existsSync(storePath)) return { auditorias: [], respostas: [], logs: [] };
  try {
    const parsed = JSON.parse(readFileSync(storePath, "utf8")) as Partial<PersistedAuditWorkflowStore>;
    return {
      auditorias: parsed.auditorias ?? [],
      respostas: parsed.respostas ?? [],
      logs: parsed.logs ?? []
    };
  } catch {
    return { auditorias: [], respostas: [], logs: [] };
  }
}

function getFileStore() {
  if (!globalState.qualisaudeAuditWorkflowStore) {
    globalState.qualisaudeAuditWorkflowStore = readPersistedStore();
  }
  return globalState.qualisaudeAuditWorkflowStore;
}

function saveFileStore() {
  mkdirSync(dirname(storePath), { recursive: true });
  writeFileSync(storePath, JSON.stringify(getFileStore(), null, 2));
}

async function withPrisma<T>(operation: (prisma: ReturnType<typeof getPrismaClient>) => Promise<T>) {
  if (globalState.qualisaudeAuditWorkflowPrismaUnavailable) return null;
  try {
    return await operation(getPrismaClient());
  } catch (error) {
    globalState.qualisaudeAuditWorkflowPrismaUnavailable = true;
    console.warn("[audit-workflow] Prisma indisponível. Usando store local.", error instanceof Error ? error.message : error);
    return null;
  }
}

function checklistById(checklistId: string) {
  return checklistTemplateGroups.find((group) => group.id === checklistId) ?? null;
}

function serializeChecklist(group: ChecklistGroup) {
  return {
    id: group.id,
    titulo: group.category,
    setor: group.sector ?? group.category,
    sourceFile: group.sourceFile,
    perguntas: group.questions.map((question) => ({
      id: question.id,
      text: question.text,
      pergunta: question.pergunta,
      criterion: question.criterion,
      explicacao: question.explicacao,
      explanation: question.explanation,
      ordem: question.ordem,
      obrigatoria: question.obrigatoria ?? true
    }))
  };
}

function dbAuditToRecord(row: any): AuditWorkflowRecord {
  return {
    id: row.id,
    setor: row.sector,
    responsavelSetor: row.sectorResponsible,
    checklistId: row.checklistId,
    checklistTitulo: row.checklistTitle,
    auditorId: row.auditorId,
    auditorNome: row.auditorName,
    auditorEmail: row.auditorEmail,
    tipoAuditoria: row.auditType ?? undefined,
    observacoesIniciais: row.initialObservations ?? undefined,
    status: statusFromDb[row.status] ?? "em_andamento",
    dataInicio: row.startedAt instanceof Date ? row.startedAt.toISOString() : new Date(row.startedAt).toISOString(),
    dataFinalizacao: row.finalizedAt ? new Date(row.finalizedAt).toISOString() : undefined,
    percentualConformidade: row.compliancePercentage ?? undefined,
    parecerFinal: row.finalOpinion ?? undefined,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : new Date(row.createdAt).toISOString(),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : new Date(row.updatedAt).toISOString()
  };
}

function dbResponseToRecord(row: any): AuditWorkflowResponseRecord {
  return {
    id: row.id,
    auditoriaId: row.auditId,
    checklistId: row.checklistId,
    perguntaId: row.questionId,
    resposta: row.answer,
    status: row.status,
    observacao: row.observation ?? undefined,
    evidencia: row.evidence ?? undefined,
    risco: row.risk ?? undefined,
    idLocal: row.localId ?? undefined,
    sincronizado: row.synced,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : new Date(row.createdAt).toISOString(),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : new Date(row.updatedAt).toISOString()
  };
}

function ensureOwner(auditoria: AuditWorkflowRecord, user: AccessUser) {
  if (user.role === "ADMIN") return;
  if (auditoria.auditorId !== user.id) {
    throw new Error("Você não tem permissão para alterar esta auditoria.");
  }
}

function appendFileLog(auditoriaId: string, user: AccessUser, action: AuditWorkflowLog["action"], ip?: string) {
  getFileStore().logs.unshift({
    id: crypto.randomUUID(),
    auditoriaId,
    actorId: user.id,
    actorEmail: user.email,
    action,
    createdAt: new Date().toISOString(),
    ip
  });
}

export function getChecklistCatalog() {
  return checklistTemplateGroups.map((group) => ({
    id: group.id,
    titulo: group.category,
    setor: group.sector ?? group.category,
    totalPerguntas: group.questions.length
  }));
}

export async function createAuditWorkflow(input: CreateAuditWorkflowInput, user: AccessUser, ip?: string) {
  const setor = input.setor?.trim();
  const responsavelSetor = input.responsavelSetor?.trim();
  const checklistId = input.checklistId?.trim();
  if (!setor) throw new Error("Informe o setor auditado.");
  if (!responsavelSetor) throw new Error("Informe o responsável do setor.");
  if (!checklistId) throw new Error("Selecione um checklist.");

  const checklist = checklistById(checklistId);
  if (!checklist) throw new Error("Checklist não encontrado.");

  const prismaCreated = await withPrisma(async (prisma) => {
    const row = await (prisma as any).auditWorkflow.create({
      data: {
        sector: setor,
        sectorResponsible: responsavelSetor,
        checklistId,
        checklistTitle: checklist.category,
        auditorId: user.id,
        auditorName: user.name,
        auditorEmail: user.email,
        auditType: input.tipoAuditoria?.trim() || null,
        initialObservations: input.observacoesIniciais?.trim() || null,
        status: "IN_PROGRESS"
      }
    });
    return dbAuditToRecord(row);
  });
  if (prismaCreated) return prismaCreated;

  const now = new Date().toISOString();
  const record: AuditWorkflowRecord = {
    id: crypto.randomUUID(),
    setor,
    responsavelSetor,
    checklistId,
    checklistTitulo: checklist.category,
    auditorId: user.id,
    auditorNome: user.name,
    auditorEmail: user.email,
    tipoAuditoria: input.tipoAuditoria?.trim() || undefined,
    observacoesIniciais: input.observacoesIniciais?.trim() || undefined,
    status: "em_andamento",
    dataInicio: now,
    createdAt: now,
    updatedAt: now
  };
  getFileStore().auditorias.unshift(record);
  appendFileLog(record.id, user, "AUDIT_CREATED", ip);
  saveFileStore();
  return record;
}

export async function getAuditWorkflow(id: string) {
  const prismaRecord = await withPrisma(async (prisma) => {
    const row = await (prisma as any).auditWorkflow.findUnique({ where: { id } });
    return row ? dbAuditToRecord(row) : null;
  });
  if (prismaRecord) return prismaRecord;
  return getFileStore().auditorias.find((audit) => audit.id === id) ?? null;
}

export async function getAuditWorkflowResponses(auditoriaId: string) {
  const prismaRecords = await withPrisma(async (prisma) => {
    const rows = await (prisma as any).auditWorkflowResponse.findMany({
      where: { auditId: auditoriaId },
      orderBy: { createdAt: "asc" }
    });
    return rows.map(dbResponseToRecord) as AuditWorkflowResponseRecord[];
  });
  if (prismaRecords) return prismaRecords;
  return getFileStore().respostas.filter((response) => response.auditoriaId === auditoriaId);
}

export async function getAuditWorkflowDetails(id: string, user: AccessUser) {
  const auditoria = await getAuditWorkflow(id);
  if (!auditoria) return null;
  ensureOwner(auditoria, user);
  const checklist = checklistById(auditoria.checklistId);
  if (!checklist) throw new Error("Checklist vinculado à auditoria não foi encontrado.");
  return {
    auditoria,
    checklist: serializeChecklist(checklist),
    respostas: await getAuditWorkflowResponses(id)
  };
}

function validateResponses(checklist: ChecklistGroup, respostas: SaveAuditWorkflowResponseInput[]) {
  const questionIds = new Set(checklist.questions.map((question) => question.id));
  const invalid = respostas.find((response) => {
    if (!response.perguntaId || !questionIds.has(response.perguntaId)) return true;
    if (!response.resposta || !allowedAnswers.has(response.resposta)) return true;
    return false;
  });
  if (invalid) throw new Error("Existem respostas inválidas para este checklist.");
}

export async function saveAuditWorkflowResponses(
  auditoriaId: string,
  respostas: SaveAuditWorkflowResponseInput[],
  user: AccessUser,
  ip?: string
) {
  const auditoria = await getAuditWorkflow(auditoriaId);
  if (!auditoria) throw new Error("Auditoria não encontrada.");
  ensureOwner(auditoria, user);
  if (auditoria.status === "finalizada") throw new Error("Não é permitido salvar respostas em auditoria finalizada.");
  if (!Array.isArray(respostas) || !respostas.length) throw new Error("Informe ao menos uma resposta.");

  const checklist = checklistById(auditoria.checklistId);
  if (!checklist) throw new Error("Checklist vinculado à auditoria não foi encontrado.");
  validateResponses(checklist, respostas);

  const prismaRecords = await withPrisma(async (prisma) => {
    const saved = [];
    for (const response of respostas) {
      const row = await (prisma as any).auditWorkflowResponse.upsert({
        where: { auditId_questionId: { auditId: auditoriaId, questionId: response.perguntaId } },
        update: {
          answer: response.resposta,
          status: response.status || response.resposta,
          observation: response.observacao?.trim() || null,
          evidence: response.evidencia?.trim() || null,
          risk: response.risco?.trim() || null,
          localId: response.idLocal || undefined,
          synced: response.sincronizado ?? true
        },
        create: {
          auditId: auditoriaId,
          checklistId: auditoria.checklistId,
          questionId: response.perguntaId,
          answer: response.resposta,
          status: response.status || response.resposta,
          observation: response.observacao?.trim() || null,
          evidence: response.evidencia?.trim() || null,
          risk: response.risco?.trim() || null,
          localId: response.idLocal || null,
          synced: response.sincronizado ?? true
        }
      });
      saved.push(dbResponseToRecord(row));
    }
    return saved;
  });
  if (prismaRecords) return prismaRecords;

  const store = getFileStore();
  const now = new Date().toISOString();
  const saved = respostas.map((response) => {
    const existing = store.respostas.find((item) => item.auditoriaId === auditoriaId && item.perguntaId === response.perguntaId);
    const next: AuditWorkflowResponseRecord = {
      id: existing?.id ?? crypto.randomUUID(),
      auditoriaId,
      checklistId: auditoria.checklistId,
      perguntaId: response.perguntaId!,
      resposta: response.resposta!,
      status: response.status || response.resposta!,
      observacao: response.observacao?.trim() || undefined,
      evidencia: response.evidencia?.trim() || undefined,
      risco: response.risco?.trim() || undefined,
      idLocal: response.idLocal,
      sincronizado: response.sincronizado ?? true,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
    if (existing) {
      Object.assign(existing, next);
      return existing;
    }
    store.respostas.push(next);
    return next;
  });
  const auditInStore = store.auditorias.find((item) => item.id === auditoriaId);
  if (auditInStore) auditInStore.updatedAt = now;
  appendFileLog(auditoriaId, user, "RESPONSES_SAVED", ip);
  saveFileStore();
  return saved;
}

export function calculateAuditWorkflowResult(respostas: AuditWorkflowResponseRecord[]) {
  const applicable = respostas.filter((response) => response.resposta !== "Não se aplica");
  const conforming = applicable.filter((response) => response.resposta === "Conforme").length;
  const percentage = applicable.length ? Math.round((conforming / applicable.length) * 100) : 0;
  const opinion =
    percentage >= 90
      ? "A auditoria apresenta excelente conformidade geral."
      : percentage >= 75
        ? "A auditoria apresenta boa conformidade geral, com pontos de melhoria a acompanhar."
        : percentage >= 60
          ? "A auditoria apresenta conformidade parcial e requer plano de ação."
          : "A auditoria apresenta não conformidade crítica e requer intervenção prioritária.";
  return { percentage, opinion };
}

export async function finalizeAuditWorkflow(auditoriaId: string, user: AccessUser, ip?: string) {
  const auditoria = await getAuditWorkflow(auditoriaId);
  if (!auditoria) throw new Error("Auditoria não encontrada.");
  ensureOwner(auditoria, user);
  if (auditoria.status === "finalizada") throw new Error("Auditoria já finalizada.");

  const checklist = checklistById(auditoria.checklistId);
  if (!checklist) throw new Error("Checklist vinculado à auditoria não foi encontrado.");
  const respostas = await getAuditWorkflowResponses(auditoriaId);
  const answered = new Set(respostas.filter((response) => response.resposta).map((response) => response.perguntaId));
  if (answered.size !== checklist.questions.length) {
    throw new Error("Responda todos os itens do checklist antes de finalizar.");
  }

  const result = calculateAuditWorkflowResult(respostas);
  const finalizedAt = new Date().toISOString();

  const prismaRecord = await withPrisma(async (prisma) => {
    const row = await (prisma as any).auditWorkflow.update({
      where: { id: auditoriaId },
      data: {
        status: "COMPLETED",
        finalizedAt,
        compliancePercentage: result.percentage,
        finalOpinion: result.opinion
      }
    });
    return dbAuditToRecord(row);
  });
  if (prismaRecord) return { auditoria: prismaRecord, respostas, checklist: serializeChecklist(checklist) };

  const store = getFileStore();
  const auditInStore = store.auditorias.find((item) => item.id === auditoriaId);
  if (!auditInStore) throw new Error("Auditoria não encontrada.");
  auditInStore.status = "finalizada";
  auditInStore.dataFinalizacao = finalizedAt;
  auditInStore.percentualConformidade = result.percentage;
  auditInStore.parecerFinal = result.opinion;
  auditInStore.updatedAt = finalizedAt;
  appendFileLog(auditoriaId, user, "AUDIT_FINALIZED", ip);
  saveFileStore();
  return { auditoria: auditInStore, respostas, checklist: serializeChecklist(checklist) };
}
