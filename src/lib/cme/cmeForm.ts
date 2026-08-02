export const cmeProcesses = ["Recepção", "Expurgo", "Limpeza", "Secagem", "Inspeção", "Preparo", "Montagem", "Embalagem", "Esterilização", "Armazenamento", "Distribuição"] as const;
export const cmeEquipments = ["Autoclave", "Termodesinfectadora", "Ultrassônica", "Seladora", "Outro"] as const;
export const cmeIndicators = ["Conforme", "Não Conforme", "Não Aplicável"] as const;
export const cmeNonConformities = ["Embalagem danificada", "Material úmido", "Material vencido", "Material contaminado", "Falha na esterilização", "Outro"] as const;

export type CmeFormInput = {
  recordDate?: string; recordTime?: string; responsible?: string; sector?: string; unit?: string; recordType?: string;
  process?: string; equipment?: string; equipmentOtherDescription?: string; materialName?: string; materialCode?: string;
  quantity?: number | string; lot?: string; materialNotes?: string; chemicalIndicator?: string; biologicalIndicator?: string;
  bowieDickTest?: string; nonConformities?: string[]; nonConformityOther?: string; generalNotes?: string;
  signerName?: string; signerRole?: string; signatureDate?: string; signatureTime?: string;
};

export type CmeFormRecord = Required<Omit<CmeFormInput, "equipmentOtherDescription" | "materialCode" | "lot" | "materialNotes" | "nonConformityOther" | "generalNotes">> & {
  id: string; equipmentOtherDescription?: string; materialCode?: string; lot?: string; materialNotes?: string;
  nonConformityOther?: string; generalNotes?: string; createdAt: string; updatedAt: string; status: "Registrado";
};
