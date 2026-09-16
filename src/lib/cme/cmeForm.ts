export const cmeProcesses = ["Processamento de Produtos para Saúde"] as const;
export const cmeEquipments = ["Não aplicável"] as const;
export const cmeIndicators = ["Não Aplicável"] as const;
export const cmeNonConformities = [] as const;
export const cmeChecklistClassifications = ["Conforme", "Não Conforme", "Não se Aplica"] as const;

export type CmeChecklistResponse = {
  questionId: string;
  classification: typeof cmeChecklistClassifications[number];
  evidence?: string;
};

/** Requisitos transcritos da lista 4.4 Processamento de Produtos para Saúde. */
export const cmeChecklistItems = ([
  ["1", "Dispõe de mecanismos de identificação e controle para atendimento da demanda da organização.", "Identifica continuamente a demanda e as necessidades de cada processo atendido, organizando tarefas e definindo a periodicidade de atualização.", "Documento que demonstre a identificação das demandas dos processos clientes, conforme a periodicidade estabelecida."],
  ["2", "Adequa suas atividades às demandas assistenciais.", "Identifica as demandas assistenciais e dimensiona as entregas, planejando as atividades conforme procedimentos, áreas atendidas e necessidades do processo.", "Relação de clientes atendidos, demandas e ferramenta de controle das entregas; programação formal de procedimentos, cirurgias ou exames."],
  ["3", "Dispõe de profissionais com competências e capacitação compatíveis com a necessidade do serviço.", "Define, junto à Gestão de Pessoas, as competências dos cargos e apoia a contratação de profissionais habilitados e capacitados.", "Evidências da participação do responsável na definição de competências, recrutamento e seleção."],
  ["4", "Dimensiona recursos humanos, tecnológicos e insumos de acordo com a necessidade do serviço.", "Dimensiona profissionais, equipamentos, insumos e tecnologia considerando quantidade, disponibilidade, qualificação, rotina e urgências.", "Escalas, relação de equipamentos e produtos, controles de horas extras, requisições de urgência e plano de contingência."],
  ["5", "Planeja as atividades, avaliando as condições operacionais e de infraestrutura, viabilizando a execução dos processos de trabalho de forma segura.", "Assegura recursos disponíveis e compatíveis com a demanda e complexidade, incluindo ambiente, fluxo e condições operacionais.", "Controles de temperatura e umidade, estrutura física, fluxos unidirecionais, acesso restrito e armazenamento adequado."],
  ["6", "Estabelece plano de contingência para continuidade das atividades, incluindo a comunicação prévia a todos os envolvidos no processo.", "O plano identifica situações de ruptura, riscos, responsabilidades e a comunicação com assistência e serviços de apoio.", "Plano formal, registros de treinamento ou simulação e definição dos canais de comunicação."],
  ["7", "Identifica necessidade de treinamentos e implementa programa de capacitação frente às demandas operacionais e assistenciais.", "Identifica demandas assistenciais, operacionais e legais para definir capacitações que contemplem todas as etapas do processo.", "Cronograma atualizado, registros de treinamentos, atas ou documentos comprobatórios de capacitação."],
  ["8", "Qualifica e avalia o desempenho de fornecedores críticos, alinhado à política institucional.", "Participa da definição de critérios de escolha e avaliação periódica de fornecedores críticos, considerando requisitos legais, qualidade e segurança.", "Relação atualizada de fornecedores, avaliações de desempenho, feedbacks e relatórios de visitas técnicas."],
  ["9", "Desenvolve ações de tecnovigilância.", "Implementa e dissemina fluxos para notificação de eventos adversos e queixas técnicas de produtos para saúde e equipamentos.", "Diretrizes, notificações realizadas, acompanhamento das melhorias e evidências do conhecimento da equipe."],
  ["10", "Cumpre os protocolos de prevenção e controle de infecção.", "Implementa os protocolos estabelecidos de prevenção e controle de infecção.", "Documentos validados pelo controle de infecção, resultados de auditorias, registros de não conformidades e eventos adversos."],
  ["11", "Cumpre as diretrizes de prevenção de riscos ocupacionais e biossegurança.", "Implementa protocolos de riscos ocupacionais e biossegurança, incluindo EPIs e fluxo de atendimento a acidentes.", "Diretrizes, controles de EPIs, treinamentos, relatórios de acidentes e registros de biossegurança."],
  ["12", "Estabelece critérios e procedimentos de segurança para a pré-limpeza, transporte, enxague, secagem, desinfecção, preparo, esterilização, armazenamento e distribuição de produtos para a saúde, com base em diretrizes e evidências científicas.", "Mantém procedimentos seguros para todas as atividades, atualizados, baseados em evidências científicas e divulgados para a equipe.", "Procedimentos de cada etapa, acompanhamento do fluxo e comprovação da capacitação da equipe."],
  ["13", "Executa controles de qualidade por meio da monitorização química, física e biológica para assegurar a efetividade do processo.", "Realiza, documenta e avalia controles conforme periodicidade, etapa e equipamento, antes da liberação dos materiais.", "Registros dos controles químico, físico e biológico, com aprovação do profissional responsável."],
  ["14", "Cumpre os critérios e procedimentos de segurança para a utilização de equipamentos.", "Descreve e dissemina procedimentos de uso seguro dos equipamentos conforme fabricante e gestão de equipamentos; a equipe deve ser treinada.", "Procedimentos de uso seguro e documentos de capacitação da equipe."],
  ["15", "Cumpre os critérios e procedimentos de segurança para a utilização de insumos.", "Descreve e dissemina o uso seguro de testes, saneantes, embalagens e escovas; a equipe deve ser treinada.", "Procedimentos descritos e documento comprobatório de capacitação."],
  ["16", "Documenta todas as etapas do processamento de produtos para a saúde, de forma a garantir a rastreabilidade de cada lote processado.", "Registra e controla limpeza, desinfecção, preparo, esterilização e distribuição, identificando lote, data, responsável e validade quando aplicável.", "Registro do monitoramento das etapas de processamento."],
  ["17", "Estabelece e dissemina o procedimento para esterilização de instrumental cirúrgico e produtos para saúde que não pertençam ao serviço.", "Formaliza e divulga a rotina para as partes interessadas, incluindo médicos, fornecedores de OPME e dispositivos médicos personalizados.", "Rotina de esterilização e demonstração do processo."],
  ["18", "Dispõe de procedimentos para processamento de produtos para saúde rotulados como de uso único.", "Descreve e dissemina diretrizes para processamento de produtos de uso único conforme legislação vigente.", "Documento com diretrizes e comprovação de capacitação."],
  ["19", "Monitora a qualidade dos instrumentais cirúrgicos e produtos para a saúde.", "Realiza monitoramento periódico e prova de função de instrumentais e produtos conforme o perfil institucional.", "Registros do monitoramento realizado."],
  ["20", "Monitora a validação dos equipamentos e propõe ações de melhoria.", "Acompanha qualificação de instalação, operacional e de desempenho, assegurando reprodutibilidade dos processos de esterilização.", "Laudos de validação, avaliação da empresa, análise técnica e ações de melhoria."],
  ["21", "Dispõe de inventário dos instrumentais cirúrgicos e produtos para a saúde.", "Mantém método de controle e atualização periódica do inventário para rastreabilidade.", "Mecanismos de controle, conferência dos itens e resultados do inventário."],
  ["22", "Dispõe de procedimentos para o controle de estoque de produtos para a saúde esterilizados.", "Controla estoque e rastreabilidade dos produtos esterilizados, incluindo data de esterilização e validade.", "Mecanismos de controle, conferência de itens e resultados sobre perdas ou desvios de qualidade."],
  ["23", "Cumpre procedimentos para transporte seguro de instrumental cirúrgico e produtos para a saúde.", "Estabelece transporte seguro de materiais sujos e limpos, interno ou externo, e higienização dos recipientes.", "Procedimentos atualizados e evidências de higienização dos recipientes."],
  ["24", "Monitora a qualidade da água nas etapas de limpeza, desinfecção e esterilização.", "Cumpre diretrizes de controle da qualidade da água e analisa resultados físico-químicos e microbiológicos.", "Diretrizes, registros de controle, laudos e ações corretivas quando necessárias."],
  ["25", "Monitora o programa de manutenção preventiva e corretiva dos equipamentos, incluindo a calibração, quando aplicável.", "Acompanha preventivas, corretivas e calibração de osmose reversa, autoclaves e equipamentos de desinfecção e esterilização.", "Cronogramas, relatórios de execução, prontuários, certificados de calibração e ordens de serviço."],
  ["26", "Monitora o programa de manutenção preventiva e corretiva da infraestrutura.", "Acompanha manutenção da estrutura física e equipamentos de infraestrutura junto à gestão responsável.", "Cronogramas, relatórios, prontuários e rastreabilidade de ordens de serviço."],
  ["27", "Cumpre com as determinações do plano de gerenciamento de resíduos.", "Segrega e descarta resíduos conforme PGRSS, política ambiental e legislação vigente.", "Fluxos, registros de conhecimento da equipe e estrutura de descarte temporário e definitivo."]
] as const).map(([number, requirement, guidance, evidenceSuggestion]) => ({
  id: `cme-4-4-${number}`,
  number,
  requirement,
  guidance,
  evidenceSuggestion
}));

export type CmeFormInput = {
  recordDate?: string; recordTime?: string; responsible?: string; sector?: string; unit?: string; recordType?: string;
  process?: string; equipment?: string; equipmentOtherDescription?: string; materialName?: string; materialCode?: string;
  quantity?: number | string; lot?: string; materialNotes?: string; chemicalIndicator?: string; biologicalIndicator?: string;
  bowieDickTest?: string; nonConformities?: string[]; nonConformityOther?: string; generalNotes?: string;
  signerName?: string; signerRole?: string; signatureDate?: string; signatureTime?: string;
  checklistResponses?: CmeChecklistResponse[];
};

export type CmeFormRecord = Required<Omit<CmeFormInput, "equipmentOtherDescription" | "materialCode" | "lot" | "materialNotes" | "nonConformityOther" | "generalNotes">> & {
  id: string; equipmentOtherDescription?: string; materialCode?: string; lot?: string; materialNotes?: string;
  nonConformityOther?: string; generalNotes?: string; createdAt: string; updatedAt: string; status: "Registrado";
  checklistResponses?: CmeChecklistResponse[];
};
