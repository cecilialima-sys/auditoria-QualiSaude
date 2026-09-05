import { checklistSource as source01 } from "./imported-data/source-01";
import { checklistSource as source02 } from "./imported-data/source-02";
import { checklistSource as source03 } from "./imported-data/source-03";
import { checklistSource as source04 } from "./imported-data/source-04";
import { checklistSource as source05 } from "./imported-data/source-05";
import { checklistSource as source06 } from "./imported-data/source-06";
import { checklistSource as source07 } from "./imported-data/source-07";
import { checklistSource as source08 } from "./imported-data/source-08";
import { checklistSource as source09 } from "./imported-data/source-09";
import { checklistSource as source10 } from "./imported-data/source-10";
import { checklistSource as source11 } from "./imported-data/source-11";
import { checklistSource as source12 } from "./imported-data/source-12";
import { checklistSource as source13 } from "./imported-data/source-13";
import { checklistSource as source14 } from "./imported-data/source-14";
import { checklistSource as source15 } from "./imported-data/source-15";
import { checklistSource as source16 } from "./imported-data/source-16";
import { checklistSource as source17 } from "./imported-data/source-17";
import { checklistSource as source18 } from "./imported-data/source-18";

export type ImportedChecklistSource = {
  id: string;
  sourceFile: string;
  number: string;
  sector: string;
  category: string;
  section: string;
  items: ReadonlyArray<{ number: string; text: string }>;
};

/** Requirements transcribed from the provided audit documents. */
export const importedChecklistSources: ImportedChecklistSource[] = [
  source01, source02, source03, source04, source05, source06, source07, source08, source09,
  source10, source11, source12, source13, source14, source15, source16, source17, source18
];

function practicalGuidance(requirement: string) {
  const text = requirement.toLocaleLowerCase("pt-BR");
  if (/(treinamento|capacita)/.test(text)) return "Verifique registros de capacitação, conteúdo compatível com a atividade, participação dos profissionais e atualização periódica.";
  if (/(manutenção|calibra)/.test(text)) return "Confirme cronograma, ordens de serviço, certificados ou registros de manutenção e se as intervenções estão dentro da periodicidade prevista.";
  if (/(indicador|monitor|acompanha|avalia)/.test(text)) return "Solicite os registros de acompanhamento, a periodicidade definida, os resultados analisados e as ações adotadas diante de desvios.";
  if (/(registro|document|política|plano|protocolo|diretriz)/.test(text)) return "Procure a versão vigente do documento, sua aprovação e divulgação, além de evidências de que é aplicado na rotina do serviço.";
  if (/(equipamento|tecnol)/.test(text)) return "Inspecione a disponibilidade, identificação, condições de uso e os registros que comprovem que o equipamento é seguro e adequado à atividade.";
  if (/(estrutura|infraestrutura|ambiente|instala)/.test(text)) return "Observe as condições físicas do ambiente, a organização, a segurança e as evidências de manutenção compatíveis com o processo avaliado.";
  if (/(risco|segurança|incidente|evento adverso)/.test(text)) return "Verifique como o risco é identificado, comunicado e tratado, incluindo registros de análise e medidas de prevenção ou correção.";
  if (/(dimensiona|recursos humanos|insumos)/.test(text)) return "Compare a demanda do serviço com escalas, recursos, insumos e registros que demonstrem capacidade suficiente para executar a atividade com segurança.";
  if (/(controle de infecção|biossegurança|epi)/.test(text)) return "Observe práticas assistenciais, disponibilidade de recursos de proteção e evidências de cumprimento das medidas de prevenção aplicáveis.";
  if (/(paciente|cliente|acompanhante)/.test(text)) return "Verifique, por observação e registros, se a assistência e a comunicação ocorrem de forma segura, oportuna e conforme o procedimento definido.";
  return "Verifique no processo, nos registros e na observação direta evidências objetivas de que este requisito é cumprido na rotina do serviço.";
}

export const importedChecklistGroups = importedChecklistSources.map((source) => ({
  id: source.id,
  sourceFile: source.sourceFile,
  sector: source.sector,
  category: source.category,
  questions: source.items.map((item, index) => ({
    id: `${source.id}-r${String(index + 1).padStart(2, "0")}`,
    area: source.section,
    section: source.section,
    itemNumber: `${source.number}.${item.number}`,
    pergunta: `${source.number}.${item.number} ${item.text}`,
    explicacao: practicalGuidance(item.text),
    obrigatoria: true,
    tipoResposta: "sim_nao" as const,
    ordem: index + 1,
    text: `${source.number}.${item.number} ${item.text}`,
    criterion: "",
    explanation: practicalGuidance(item.text),
    order: index + 1
  }))
}));
