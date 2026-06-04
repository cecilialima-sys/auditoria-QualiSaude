import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";

export type MobileChecklistAnswer = {
  perguntaId: string;
  resposta: string;
  observacao?: string;
  risco?: string;
};

export type MobileSyncRecord = {
  id: string;
  idLocal: string;
  checklistId: string;
  usuarioId: string;
  usuarioEmail: string;
  setor: string;
  leito?: string;
  respostas: MobileChecklistAnswer[];
  origem: "mobile/offline";
  status: "sincronizado";
  criadoEm: string;
  atualizadoEm: string;
  recebidoEm: string;
  ip?: string;
};

export type MobileSyncLog = {
  id: string;
  idLocal: string;
  usuarioEmail: string;
  action: "SYNC_CREATED" | "SYNC_DUPLICATE";
  createdAt: string;
  ip?: string;
};

const globalState = globalThis as typeof globalThis & {
  qualisaudeMobileSyncRecords?: MobileSyncRecord[];
  qualisaudeMobileSyncLogs?: MobileSyncLog[];
};

const storePath = join(process.cwd(), "data", "mobile-sync-store.json");

type PersistedMobileSyncStore = {
  records: MobileSyncRecord[];
  logs: MobileSyncLog[];
};

function readPersistedStore() {
  if (!existsSync(storePath)) return null;
  try {
    return JSON.parse(readFileSync(storePath, "utf8")) as PersistedMobileSyncStore;
  } catch {
    return null;
  }
}

function saveMobileSyncStore() {
  mkdirSync(dirname(storePath), { recursive: true });
  writeFileSync(
    storePath,
    JSON.stringify(
      {
        records: globalState.qualisaudeMobileSyncRecords ?? [],
        logs: globalState.qualisaudeMobileSyncLogs ?? []
      },
      null,
      2
    )
  );
}

export function getMobileSyncRecords() {
  if (!globalState.qualisaudeMobileSyncRecords) {
    const persisted = readPersistedStore();
    globalState.qualisaudeMobileSyncRecords = persisted?.records ?? [];
    globalState.qualisaudeMobileSyncLogs = persisted?.logs ?? [];
  }
  return globalState.qualisaudeMobileSyncRecords;
}

export function getMobileSyncLogs() {
  if (!globalState.qualisaudeMobileSyncLogs) {
    getMobileSyncRecords();
  }
  return globalState.qualisaudeMobileSyncLogs ?? [];
}

export function findMobileSyncRecordByLocalId(idLocal: string) {
  return getMobileSyncRecords().find((record) => record.idLocal === idLocal);
}

export function createMobileSyncRecord(
  record: Omit<MobileSyncRecord, "id" | "origem" | "status" | "recebidoEm">,
  ip?: string
) {
  const existing = findMobileSyncRecordByLocalId(record.idLocal);
  if (existing) {
    getMobileSyncLogs().unshift({
      id: crypto.randomUUID(),
      idLocal: record.idLocal,
      usuarioEmail: record.usuarioEmail,
      action: "SYNC_DUPLICATE",
      createdAt: new Date().toISOString(),
      ip
    });
    saveMobileSyncStore();
    return { record: existing, duplicated: true };
  }

  const created: MobileSyncRecord = {
    ...record,
    id: crypto.randomUUID(),
    origem: "mobile/offline",
    status: "sincronizado",
    recebidoEm: new Date().toISOString(),
    ip
  };

  getMobileSyncRecords().push(created);
  getMobileSyncLogs().unshift({
    id: crypto.randomUUID(),
    idLocal: record.idLocal,
    usuarioEmail: record.usuarioEmail,
    action: "SYNC_CREATED",
    createdAt: new Date().toISOString(),
    ip
  });
  saveMobileSyncStore();
  return { record: created, duplicated: false };
}
