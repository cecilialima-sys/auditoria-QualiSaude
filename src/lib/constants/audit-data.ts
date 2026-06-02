export const auditStatuses = [
  "Conforme",
  "Nao conforme",
  "Nao se aplica"
] as const;

export const riskLevels = ["Baixo", "Moderado", "Alto", "CrÃ­tico"] as const;

export const auditTypes = [
  "Auditoria interna",
  "Auditoria externa",
  "Auditoria de rotina",
  "Auditoria extraordinÃ¡ria",
  "Auditoria de seguranÃ§a do paciente",
  "Auditoria de qualidade assistencial",
  "Auditoria documental",
  "Auditoria estrutural",
  "Auditoria de processo",
  "Auditoria de resultado"
];

export const categories = [
  "SeguranÃ§a do paciente",
  "IdentificaÃ§Ã£o do paciente",
  "HigienizaÃ§Ã£o das mÃ£os",
  "AdministraÃ§Ã£o de medicamentos",
  "Registros em prontuÃ¡rio",
  "SistematizaÃ§Ã£o da AssistÃªncia de Enfermagem",
  "Protocolos institucionais",
  "Risco de queda",
  "LesÃ£o por pressÃ£o",
  "PrevenÃ§Ã£o de infecÃ§Ã£o",
  "Cirurgia segura",
  "Controle de materiais",
  "Equipamentos",
  "Estrutura fÃ­sica",
  "Dimensionamento de equipe",
  "BiosseguranÃ§a",
  "ResÃ­duos de serviÃ§os de saÃºde",
  "EducaÃ§Ã£o permanente",
  "ComunicaÃ§Ã£o efetiva",
  "GestÃ£o de indicadores",
  "Continuidade do cuidado",
  "Plano terapÃªutico",
  "Acolhimento e humanizaÃ§Ã£o",
  "Controle de temperatura",
  "Validade de materiais e medicamentos",
  "Limpeza e desinfecÃ§Ã£o",
  "Fluxos assistenciais",
  "Eventos adversos",
  "NÃ£o conformidades anteriores",
  "Plano de aÃ§Ã£o"
];

export const sectors = [
  "Centro CirÃºrgico",
  "Sala de RecuperaÃ§Ã£o PÃ³s-AnestÃ©sica",
  "Unidade de Terapia Intensiva Adulto",
  "Unidade de Terapia Intensiva PediÃ¡trica",
  "Unidade de Terapia Intensiva Neonatal",
  "Pronto Atendimento",
  "Pronto-Socorro",
  "ClÃ­nica MÃ©dica",
  "ClÃ­nica CirÃºrgica",
  "Pediatria",
  "Maternidade",
  "ObstetrÃ­cia",
  "BerÃ§Ã¡rio",
  "Alojamento Conjunto",
  "CME - Central de Material e EsterilizaÃ§Ã£o",
  "FarmÃ¡cia Hospitalar",
  "Almoxarifado",
  "LaboratÃ³rio",
  "DiagnÃ³stico por Imagem",
  "HemodinÃ¢mica",
  "Endoscopia",
  "AmbulatÃ³rio",
  "Oncologia",
  "HemodiÃ¡lise",
  "Banco de Sangue / AgÃªncia Transfusional",
  "NutriÃ§Ã£o e DietÃ©tica",
  "LactÃ¡rio",
  "ServiÃ§o de Controle de InfecÃ§Ã£o Hospitalar",
  "Hotelaria Hospitalar",
  "HigienizaÃ§Ã£o",
  "Rouparia",
  "ManutenÃ§Ã£o",
  "SeguranÃ§a do Paciente",
  "NÃºcleo de Qualidade",
  "EducaÃ§Ã£o Permanente",
  "ComissÃ£o de Ã‰tica de Enfermagem",
  "GestÃ£o de Leitos",
  "RecepÃ§Ã£o / AdmissÃ£o",
  "Faturamento",
  "Arquivo MÃ©dico / SAME"
];

export const dashboardMetrics = {
  totalAudits: 0,
  pending: 0,
  inProgress: 0,
  completed: 0,
  compliance: 0,
  nonCompliance: 0,
  openNonConformities: 0,
  resolvedNonConformities: 0,
  averageResolutionDays: 0,
  overdue: 0,
  criticalRisk: 0
};

export const monthlyEvolution: Array<{ month: string; conformidade: number; auditorias: number }> = [];

export const sectorRanking: Array<{ sector: string; compliance: number; risk: string }> = [];

export const nonConformitiesByCategory: Array<{ name: string; value: number }> = [];


