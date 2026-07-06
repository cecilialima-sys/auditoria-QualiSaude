import type { ChecklistGroup } from "@/lib/checklists/checklist-template";

export type AuditScope = {
  unit: string;
  sector: string;
};

function titleCaseFirst(value: string) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
}

function stripKnownUnitPrefix(value: string) {
  const unit = value
    .replace(/^Unidade de\s+/i, "")
    .replace(/^Assist[eê]ncia\s+/i, "")
    .trim();
  return titleCaseFirst(unit);
}

function splitKnownSector(value: string) {
  const text = value.trim();
  const match = text.match(/^(Interna[cç][aã]o)\s+(.+)$/i);
  if (!match) return null;
  return {
    unit: "Internação",
    sector: match[2].trim()
  };
}

export function resolveAuditScope(unitOrSector: string, checklist?: Pick<ChecklistGroup, "category" | "sector"> | null): AuditScope {
  const checklistSector = (checklist?.sector || checklist?.category || "").trim();
  const checklistSplit = splitKnownSector(checklistSector);
  const rawUnit = stripKnownUnitPrefix(unitOrSector || checklistSplit?.unit || checklistSector || "Não informado");
  const directSplit = splitKnownSector(rawUnit);
  const unit = directSplit?.unit || rawUnit;

  if (checklistSplit && unit.toLowerCase() === checklistSplit.unit.toLowerCase()) {
    return checklistSplit;
  }

  const normalizedUnit = unit.toLowerCase();
  const sector = directSplit?.sector || (checklistSector.toLowerCase().startsWith(normalizedUnit)
    ? checklistSector.slice(unit.length).trim()
    : checklistSector);

  return {
    unit,
    sector: sector || unit
  };
}
