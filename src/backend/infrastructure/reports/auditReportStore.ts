import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import type { AuditReportDocument, StoredAuditReport } from "@/backend/application/reports/auditReportTypes";

const globalState = globalThis as typeof globalThis & {
  qualisaudeAuditReports?: StoredAuditReport[];
};

const dataDir = process.env.DATA_DIR ? resolve(process.env.DATA_DIR) : join(process.cwd(), "data");
const storePath = process.env.AUDIT_REPORT_STORE_PATH
  ? resolve(process.env.AUDIT_REPORT_STORE_PATH)
  : join(dataDir, "audit-report-store.json");
const reportsDir = process.env.REPORTS_DIR ? resolve(process.env.REPORTS_DIR) : join(dataDir, "reports");

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

export function readStoredAuditReportHtml(id: string) {
  const report = findStoredAuditReport(id);
  if (!report?.htmlPath || !existsSync(report.htmlPath)) return null;
  return { report, html: readFileSync(report.htmlPath, "utf8") };
}

export function readStoredAuditReportDocument(id: string) {
  const report = findStoredAuditReport(id);
  if (!report?.documentPath || !existsSync(report.documentPath)) return null;
  try {
    return {
      report,
      document: JSON.parse(readFileSync(report.documentPath, "utf8")) as AuditReportDocument
    };
  } catch {
    return null;
  }
}

export function persistAuditReport(
  record: Omit<StoredAuditReport, "filePath" | "documentPath" | "htmlPath" | "hash" | "version">,
  pdf: Buffer,
  document: AuditReportDocument,
  html: string
) {
  mkdirSync(reportsDir, { recursive: true });
  const filePath = join(reportsDir, `${record.id}.pdf`);
  const documentPath = join(reportsDir, `${record.id}.json`);
  const htmlPath = join(reportsDir, `${record.id}.html`);
  writeFileSync(filePath, pdf);
  writeFileSync(documentPath, JSON.stringify(document, null, 2));
  writeFileSync(htmlPath, html);

  const stored: StoredAuditReport = {
    ...record,
    filePath,
    documentPath,
    htmlPath,
    hash: createHash("sha256").update(pdf).digest("hex"),
    version: 2
  };

  getStoredAuditReports().unshift(stored);
  saveReportMetadata();
  return stored;
}
