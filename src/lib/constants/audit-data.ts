export const auditStatuses = [
  "Conforme",
  "Não conforme",
  "Não se aplica"
] as const;

export const riskLevels = ["Baixo", "Moderado", "Alto", "Crítico"] as const;

export const auditTypes = [
  "Auditoria interna",
  "Auditoria externa",
  "Auditoria de rotina",
  "Auditoria extraordinária",
  "Auditoria de segurança do paciente",
  "Auditoria de qualidade assistencial",
  "Auditoria documental",
  "Auditoria estrutural",
  "Auditoria de processo",
  "Auditoria de resultado"
];

export const categories = [
  "Segurança do paciente",
  "Identificação do paciente",
  "Higienização das mãos",
  "Administração de medicamentos",
  "Registros em prontuário",
  "Sistematização da Assistência de Enfermagem",
  "Protocolos institucionais",
  "Risco de queda",
  "Lesão por pressão",
  "Prevenção de infecção",
  "Cirurgia segura",
  "Controle de materiais",
  "Equipamentos",
  "Estrutura física",
  "Dimensionamento de equipe",
  "Biossegurança",
  "Resíduos de serviços de saúde",
  "Educação permanente",
  "Comunicação efetiva",
  "Gestão de indicadores",
  "Continuidade do cuidado",
  "Plano terapêutico",
  "Acolhimento e humanização",
  "Controle de temperatura",
  "Validade de materiais e medicamentos",
  "Limpeza e desinfecção",
  "Fluxos assistenciais",
  "Eventos adversos",
  "Não conformidades anteriores",
  "Plano de ação"
];

export const sectors = [
  "Centro Cirúrgico",
  "Sala de Recuperação Pós-Anestésica",
  "Unidade de Terapia Intensiva Adulto",
  "Unidade de Terapia Intensiva Pediátrica",
  "Unidade de Terapia Intensiva Neonatal",
  "Pronto Atendimento",
  "Pronto-Socorro",
  "Clínica Médica",
  "Clínica Cirúrgica",
  "Pediatria",
  "Maternidade",
  "Obstetrícia",
  "Berçário",
  "Alojamento Conjunto",
  "CME - Central de Material e Esterilização",
  "Farmácia Hospitalar",
  "Almoxarifado",
  "Laboratório",
  "Diagnóstico por Imagem",
  "Hemodinâmica",
  "Endoscopia",
  "Ambulatório",
  "Oncologia",
  "Hemodiálise",
  "Banco de Sangue / Agência Transfusional",
  "Nutrição e Dietética",
  "Lactário",
  "Serviço de Controle de Infecção Hospitalar",
  "Hotelaria Hospitalar",
  "Higienização",
  "Rouparia",
  "Manutenção",
  "Segurança do Paciente",
  "Núcleo de Qualidade",
  "Educação Permanente",
  "Comissão de Ética de Enfermagem",
  "Gestão de Leitos",
  "Recepção / Admissão",
  "Faturamento",
  "Arquivo Médico / SAME"
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
