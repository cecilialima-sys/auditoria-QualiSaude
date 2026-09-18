import type { NormativeReference, TechnicalReportItem, TechnicalReportSummary } from "@/backend/application/reports/technicalAuditReportTypes";
import { GeminiTextError, generateGeminiText } from "./GeminiTextService";

export class TechnicalAuditAiError extends Error {}

const INSTRUCTIONS = `Você é um Enfermeiro Auditor Sênior especializado em auditoria hospitalar, qualidade assistencial, segurança do paciente e gestão de riscos. Redija uma constatação técnica em português brasileiro formal, clara, detalhada e proporcional, pronta para um Relatório de Auditoria Interna no padrão institucional.

Use exclusivamente o requisito, a orientação de auditoria, a classificação e as evidências fornecidas. O requisito e a orientação não comprovam fatos: servem somente como contexto. Nunca invente ou complete entrevistas, documentos, datas, nomes, normas, procedimentos, consequências, causas, ações, resultados ou evidências. Não altere a classificação nem transforme ausência de evidência em certeza. Quando algo não foi apresentado, use “não foi evidenciado” ou “não foi apresentado”. Não cite legislação nem números de normas, exceto quando ela constar expressamente na lista validada e for diretamente pertinente ao achado.

Produza de dois a quatro parágrafos curtos, usando marcador “•” no início de cada parágrafo: primeiro descreva a constatação; depois explique a aderência ou fragilidade em linguagem técnico-assistencial; para itens não conformes, inclua um “Ponto de atenção:” com recomendação proporcional e vinculada ao achado. Para itens conformes, descreva a evidência de aderência sem criar elogios ou controles não observados.

Mencione legislação, regulamento ou manual somente quando ele estiver na lista de referências normativas validadas recebida no contexto. Não cite números de normas não fornecidos. Ao utilizar uma referência validada, mencione-a de forma objetiva e apenas se for diretamente pertinente ao requisito. Não use HTML, títulos, linguagem acusatória nem listas de documentos inexistentes.`;

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

  if (/(cme|esteriliz|processamento de produtos|autoclave|termodesinfectadora)/.test(subject)) {
    references.push({
      label: "RDC Anvisa nº 15/2012 — Boas Práticas para o Processamento de Produtos para Saúde",
      sourceUrl: "https://bvs.saude.gov.br/bvs/saudelegis/anvisa/2012/rdc0015_15_03_2012.html"
    });
  }

  return references;
}

export class TechnicalAuditAiService {
  async analyzeItem(context: { sector: string; auditType: string; normativeReference: string; item: TechnicalReportItem }) {
    const { item } = context;
    const evidence = [item.evidenceOriginal, item.observation].filter(Boolean).join("\nObservações: ");
    const references = validatedReferences(item, context.normativeReference);
    if (!evidence.trim()) return { analysis: "• Não foi registrada evidência ou observação complementar para este requisito.\n• Ponto de atenção: a constatação deve ser revisada pelo auditor antes da emissão do relatório.", references };
    try {
      const referenceText = references.map((reference) => reference.label).join("\n") || "Nenhuma referência normativa específica validada.";
      const generated = await generateGeminiText({ instruction: INSTRUCTIONS, prompt: `Setor: ${context.sector}\nTipo de auditoria: ${context.auditType}\nNorma/checklist de referência: ${context.normativeReference}\nNúmero do requisito: ${item.number}\nRequisito: ${item.requirement}\nOrientação para auditoria: ${item.auditGuidance || "Não informada"}\nClassificação definida pelo auditor: ${item.classification}\nEvidência original do auditor: ${item.evidenceOriginal || "Não informada"}\nObservações adicionais: ${item.observation || "Não informadas"}\nReferências normativas validadas (use apenas se pertinentes):\n${referenceText}\n\nElabore somente a constatação técnica no formato solicitado.`, maxOutputTokens: 1100 });
      const analysis = clean(generated);
      if (!analysis) throw new TechnicalAuditAiError("A IA não retornou uma análise válida. Tente novamente.");
      return { analysis, references };
    } catch (error) {
      if (error instanceof TechnicalAuditAiError) throw error;
      if (error instanceof GeminiTextError) throw new TechnicalAuditAiError(error.message);
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
    if (!process.env.GEMINI_API_KEY?.trim() || !items.some((item) => item.analysisAi)) return fallback;

    const source = items
      .filter((item) => item.analysisFinal)
      .slice(0, 30)
      .map((item) => `Requisito ${item.number} | ${item.classification}\n${item.analysisFinal}`)
      .join("\n\n");
    try {
      const response = await generateGeminiText({
        instruction: `Você é um Enfermeiro Auditor Sênior. Consolide exclusivamente as constatações técnicas fornecidas, sem inventar fatos, documentos, datas, normas ou conclusões. Retorne somente JSON válido com as chaves generalOpinion (texto), positivePoints (até 4 textos), criticalPoints (até 5 textos) e improvementPoints (até 5 textos). Use português brasileiro formal. Os pontos de melhoria devem ser proporcionais aos achados e não criar exigências novas.`,
        prompt: `Resumo numérico: ${summary.conforming} conformes, ${summary.nonConforming} não conformes, ${summary.notApplicable} não aplicáveis, de ${summary.total} requisitos.\n\nConstatações:\n${source}`,
        maxOutputTokens: 1100,
        responseMimeType: "application/json"
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
