import type { NormativeReference, TechnicalReportItem, TechnicalReportSummary } from "@/backend/application/reports/technicalAuditReportTypes";
import { OpenAiTextError, generateOpenAiText } from "./OpenAiTextService";

export class TechnicalAuditAiError extends Error {}

const INSTRUCTIONS = `Você é um Enfermeiro Auditor Sênior, especialista em auditoria hospitalar, qualidade assistencial, segurança do paciente e gestão de riscos. Redija uma constatação técnico-auditiva em português brasileiro formal, clara, objetiva e pronta para integrar um Relatório Técnico de Auditoria.

Use exclusivamente a evidência do auditor para declarar fatos. O requisito, a orientação e as referências normativas contextualizam a análise, mas não provam que algo ocorreu. É proibido inventar, completar ou presumir entrevistas, documentos, datas, nomes, locais, equipamentos, processos, causas, consequências, resultados ou evidências. Não altere a classificação nem aumente ou reduza a gravidade. Quando não houver apresentação de evidência, use “não foi evidenciado” ou “não foi apresentado”, sem afirmar que inexiste.

Produza entre três e quatro parágrafos curtos, iniciados por “•”, obrigatoriamente nesta ordem:
1. “Constatação:” descreva fielmente o achado ou a evidência disponível.
2. “Análise técnico-assistencial:” relacione o achado ao requisito avaliado, sem extrapolar os fatos.
3. “Referencial técnico-normativo:” mencione apenas as referências que vierem na lista validada e que forem diretamente pertinentes. Se nenhuma for pertinente, escreva “não indicado para este achado”.
4. Para classificação “Não conforme”, inclua “Oportunidade de melhoria:” com encaminhamento proporcional ao fato registrado; para “Conforme”, descreva a aderência registrada sem criar elogios, controles ou resultados não observados; para “Não se aplica”, registre somente a justificativa disponível.

Não use HTML, títulos adicionais, linguagem acusatória, ameaças de sanção, listas de documentos inexistentes nem recomendações não relacionadas ao achado.`;

function clean(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, 12000);
}

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function validatedReferences(item: TechnicalReportItem, normativeReference: string): NormativeReference[] {
  const subject = normalized(`${item.requirement} ${item.auditGuidance} ${normativeReference}`);
  const references: NormativeReference[] = [{
    label: "RDC Anvisa nº 63/2011 — Requisitos de Boas Práticas de Funcionamento para Serviços de Saúde",
    sourceUrl: "https://bvsms.saude.gov.br/bvs/saudelegis/anvisa/2011/rdc0063_25_11_2011.html"
  }];

  if (/(seguranca do paciente|evento adverso|incidente|risco|queda|identifica[cç][aã]o do paciente|medicamento|transi[cç][aã]o do cuidado)/.test(subject)) {
    references.push({
      label: "RDC Anvisa nº 36/2013 — Ações para a Segurança do Paciente em Serviços de Saúde",
      sourceUrl: "https://bvs.saude.gov.br/bvs/saudelegis/anvisa/2013/rdc0036_25_07_2013.html"
    });
  }

  if (/(dimensiona|dimensionamento|quadro de profissionais|recursos humanos)/.test(subject)) {
    references.push({
      label: "Parecer Normativo Cofen nº 1/2024 — Parâmetros para planejamento da força de trabalho de Enfermagem",
      sourceUrl: "https://www.cofen.gov.br/parecer-normativo-no-1-2024-cofen/"
    });
  }

  if (/(enfermagem|equipe de enfermagem|assistencia de enfermagem|profissional de enfermagem)/.test(subject)) {
    references.push(
      {
        label: "Lei nº 7.498/1986 — Regulamenta o exercício da Enfermagem",
        sourceUrl: "https://www.planalto.gov.br/ccivil_03/leis/l7498.htm"
      },
      {
        label: "Decreto nº 94.406/1987 — Regulamenta a Lei nº 7.498/1986",
        sourceUrl: "https://www.planalto.gov.br/ccivil_03/decreto/1980-1989/d94406.htm"
      },
      {
        label: "Resolução Cofen nº 564/2017 — Código de Ética dos Profissionais de Enfermagem",
        sourceUrl: "https://www.cofen.gov.br/resolucao-cofen-no-5642017/"
      }
    );
  }

  if (/(registro|prontuario|prontuário|anotacao|anotação|processo de enfermagem|sistematiza)/.test(subject)) {
    references.push({
      label: "Resolução Cofen nº 736/2024 — Implementação do Processo de Enfermagem",
      sourceUrl: "https://www.cofen.gov.br/resolucao-cofen-no-736-de-17-de-janeiro-de-2024/"
    });
  }

  if (/(responsavel tecnico|responsável técnico|anotacao de responsabilidade tecnica|anotação de responsabilidade técnica|\bart\b|\bert\b)/.test(subject)) {
    references.push({
      label: "Resolução Cofen nº 782/2025 — Anotação de Responsabilidade Técnica e atribuições do Enfermeiro Responsável Técnico",
      sourceUrl: "https://www.cofen.gov.br/cofen-define-novas-regras-para-anotacao-de-responsabilidade-tecnica-e-especifica-atribuicoes-de-responsaveis-tecnicos/"
    });
  }

  if (/(cme|esteriliz|processamento de produtos|autoclave|termodesinfectadora)/.test(subject)) {
    references.push({
      label: "RDC Anvisa nº 15/2012 — Boas Práticas para o Processamento de Produtos para Saúde",
      sourceUrl: "https://bvs.saude.gov.br/bvs/saudelegis/anvisa/2012/rdc0015_15_03_2012.html"
    });
  }

  return references.filter((reference, index, all) => all.findIndex((candidate) => candidate.label === reference.label) === index);
}

export class TechnicalAuditAiService {
  async analyzeItem(context: { sector: string; auditType: string; normativeReference: string; item: TechnicalReportItem }) {
    const { item } = context;
    const evidence = [item.evidenceOriginal, item.observation].filter(Boolean).join("\nObservações: ");
    const references = validatedReferences(item, context.normativeReference);
    if (!evidence.trim()) return { analysis: "• Não foi registrada evidência ou observação complementar para este requisito.\n• Ponto de atenção: a constatação deve ser revisada pelo auditor antes da emissão do relatório.", references };
    try {
      const referenceText = references.map((reference) => reference.label).join("\n") || "Nenhuma referência normativa específica validada.";
      const generated = await generateOpenAiText({ instruction: INSTRUCTIONS, prompt: `Setor: ${context.sector}\nTipo de auditoria: ${context.auditType}\nNorma/checklist de referência: ${context.normativeReference}\nNúmero do requisito: ${item.number}\nRequisito: ${item.requirement}\nOrientação para auditoria: ${item.auditGuidance || "Não informada"}\nClassificação definida pelo auditor: ${item.classification}\nEvidência original do auditor: ${item.evidenceOriginal || "Não informada"}\nObservações adicionais: ${item.observation || "Não informadas"}\nReferências normativas validadas (use apenas se pertinentes):\n${referenceText}\n\nElabore somente a constatação técnica no formato solicitado.`, maxOutputTokens: 1100 });
      const analysis = clean(generated);
      if (!analysis) throw new TechnicalAuditAiError("A IA não retornou uma análise válida. Tente novamente.");
      return { analysis, references };
    } catch (error) {
      if (error instanceof TechnicalAuditAiError) throw error;
      if (error instanceof OpenAiTextError) throw new TechnicalAuditAiError(error.message);
      throw new TechnicalAuditAiError("Não foi possível concluir a análise por IA neste momento. Os dados da auditoria estão preservados. Tente novamente.");
    }
  }

  async synthesize(summary: TechnicalReportSummary, items: TechnicalReportItem[]) {
    const positives = items.filter((item) => item.classification === "Conforme" && item.analysisFinal).slice(0, 4).map((item) => item.analysisFinal);
    const critical = items.filter((item) => item.classification === "Não conforme" && item.analysisFinal).slice(0, 5).map((item) => item.analysisFinal);
    const fallback = {
      ...summary,
      generalOpinion: `Durante a auditoria interna, foram avaliados ${summary.total} requisitos: ${summary.conforming} conforme(s) (${summary.conformityPercentage}%), ${summary.nonConforming} não conforme(s) (${summary.nonConformityPercentage}%) e ${summary.notApplicable} não aplicável(eis). O parecer foi consolidado a partir das classificações e constatações registradas, devendo ser validado pelo auditor responsável antes da emissão definitiva.`,
      positivePoints: positives.length ? positives : ["Não foram registradas evidências suficientes para destacar pontos positivos adicionais."],
      criticalPoints: critical.length ? critical : ["Não foram identificados pontos críticos classificados como não conformes."],
      improvementPoints: critical.length ? critical.map((text) => `Recomenda-se acompanhar o achado relacionado a: ${text}`) : ["Manter o monitoramento periódico dos requisitos avaliados."]
    };
    if (!process.env.OPENAI_API_KEY?.trim() || !items.some((item) => item.analysisAi)) return fallback;

    const source = items
      .filter((item) => item.analysisFinal)
      .slice(0, 30)
      .map((item) => `Requisito ${item.number} | ${item.classification}\n${item.analysisFinal}`)
      .join("\n\n");
    try {
      const response = await generateOpenAiText({
        instruction: `Você é um Enfermeiro Auditor Sênior. Consolide exclusivamente as constatações técnicas fornecidas, sem inventar fatos, documentos, datas, normas ou conclusões. Retorne somente JSON válido com as chaves generalOpinion (texto), positivePoints (até 4 textos), criticalPoints (até 5 textos) e improvementPoints (até 5 textos). Use português brasileiro formal. Os pontos de melhoria devem ser proporcionais aos achados e não criar exigências novas.`,
        prompt: `Resumo numérico: ${summary.conforming} conformes, ${summary.nonConforming} não conformes, ${summary.notApplicable} não aplicáveis, de ${summary.total} requisitos.\n\nConstatações:\n${source}`,
        maxOutputTokens: 1100
      });
      const parsed = JSON.parse(response);
      const list = (value: unknown, limit: number) => Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0).map((entry) => clean(entry)).filter(Boolean).slice(0, limit)
        : [];
      const generalOpinion = typeof parsed?.generalOpinion === "string" ? clean(parsed.generalOpinion) : "";
      const positivePoints = list(parsed?.positivePoints, 4);
      const criticalPoints = list(parsed?.criticalPoints, 5);
      const improvementPoints = list(parsed?.improvementPoints, 5);
      if (!generalOpinion || !positivePoints.length || !criticalPoints.length || !improvementPoints.length) return fallback;
      return { ...summary, generalOpinion, positivePoints, criticalPoints, improvementPoints };
    } catch {
      return fallback;
    }
  }
}
