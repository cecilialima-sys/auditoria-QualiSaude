import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import type { StoredAuditReport } from "@/backend/application/reports/auditReportTypes";

const globalState = globalThis as typeof globalThis & {
  qualisaudeAuditReports?: StoredAuditReport[];
};

const storePath = join(process.cwd(), "data", "audit-report-store.json");
const reportsDir = join(process.cwd(), "data", "reports");

function readPersistedReports() {
  if (!existsSync(storePath)) return [];
  try {
    return JSON.parse(readFileSync(storePath, "utf8")) as StoredAuditReport[];
  } catch {
    return [];
  }
}

function saveReportMetadata() {
  mkdirSync(dirname(storePath), { recursive: true });
  writeFileSync(storePath, JSON.stringify(globalState.qualisaudeAuditReports ?? [], null, 2));
}

export function getStoredAuditReports() {
  if (!globalState.qualisaudeAuditReports) {
    globalState.qualisaudeAuditReports = readPersistedReports();
  }
  return globalState.qualisaudeAuditReports;
}

export function findStoredAuditReport(id: string) {
  return getStoredAuditReports().find((report) => report.id === id);
}

export function readStoredAuditReportPdf(id: string) {
  const report = findStoredAuditReport(id);
  if (!report || !existsSync(report.filePath)) return null;
  return { report, pdf: readFileSync(report.filePath) };
}

export function persistAuditReport(record: Omit<StoredAuditReport, "filePath" | "hash" | "version">, pdf: Buffer) {
  mkdirSync(reportsDir, { recursive: true });
  const filePath = join(reportsDir, `${record.id}.pdf`);
  writeFileSync(filePath, pdf);

  const stored: StoredAuditReport = {
    ...record,
    filePath,
    hash: createHash("sha256").update(pdf).digest("hex"),
    version: 1
  };

  getStoredAuditReports().unshift(stored);
  saveReportMetadata();
  return stored;
}
