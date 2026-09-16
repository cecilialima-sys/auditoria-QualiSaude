import type { NormativeReference, TechnicalReportItem, TechnicalReportSummary } from "@/backend/application/reports/technicalAuditReportTypes";

export class TechnicalAuditAiError extends Error {}

const INSTRUCTIONS = `Você é um Enfermeiro Auditor Sênior especializado em auditoria hospitalar, qualidade assistencial, segurança do paciente e gestão de riscos. Redija uma constatação técnica em português brasileiro formal, clara, detalhada e proporcional, pronta para um Relatório de Auditoria Interna no padrão institucional.

Use exclusivamente o requisito, a orientação de auditoria, a classificação e as evidências fornecidas. Nunca invente entrevistas, documentos, datas, nomes, normas, procedimentos, consequências, causas ou ações. Não altere a classificação nem transforme ausência de evidência em certeza. Quando algo não foi apresentado, use “não foi evidenciado” ou “não foi apresentado”.

Produza de dois a quatro parágrafos curtos, usando marcador “•” no início de cada parágrafo: primeiro descreva a constatação; depois explique a aderência ou fragilidade em linguagem técnico-assistencial; para itens não conformes, inclua um “Ponto de atenção:” com recomendação proporcional e vinculada ao achado. Para itens conformes, descreva a evidência de aderência sem criar elogios ou controles não observados.

Mencione legislação, regulamento ou manual somente quando ele estiver na lista de referências normativas validadas recebida no contexto. Não cite números de normas não fornecidos. Ao utilizar uma referência validada, mencione-a de forma objetiva e apenas se for diretamente pertinente ao requisito. Não use HTML, títulos, linguagem acusatória nem listas de documentos inexistentes.`;

function outputText(body: any) {
  if (typeof body?.output_text === "string") return body.output_text;
  return (body?.output ?? []).flatMap((item: any) => item.content ?? []).filter((item: any) => item.type === "output_text").map((item: any) => item.text ?? "").join("\n");
}
function clean(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, 12000);
}

function providerMessage(status: number, body: unknown) {
  const code = typeof (body as { error?: { code?: unknown } } | null)?.error?.code === "string"
    ? (body as { error: { code: string } }).error.code
    : "";
  if (status === 429) {
    return code === "insufficient_quota"
      ? "Os créditos da integração de IA foram esgotados. O relatório pode ser emitido com as evidências originais."
      : "A IA atingiu o limite temporário de uso. O relatório pode ser emitido com as evidências originais.";
  }
  if (status === 401 || status === 403) return "A configuração da integração de IA foi recusada. O relatório pode ser emitido com as evidências originais.";
  return "Não foi possível concluir a análise por IA neste momento. O relatório pode ser emitido com as evidências originais.";
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
    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key) throw new TechnicalAuditAiError("A análise técnica por IA ainda não está configurada. Os dados da auditoria foram preservados.");
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), Math.max(5000, Number(process.env.OPENAI_AI_TIMEOUT_MS || 30000)));
    try {
      const referenceText = references.map((reference) => reference.label).join("\n") || "Nenhuma referência normativa específica validada.";
      const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, signal: controller.signal, body: JSON.stringify({ model: process.env.OPENAI_MODEL?.trim() || "gpt-5-mini", instructions: INSTRUCTIONS, input: `Setor: ${context.sector}\nTipo de auditoria: ${context.auditType}\nNorma/checklist de referência: ${context.normativeReference}\nNúmero do requisito: ${item.number}\nRequisito: ${item.requirement}\nOrientação para auditoria: ${item.auditGuidance || "Não informada"}\nClassificação definida pelo auditor: ${item.classification}\nEvidência original do auditor: ${item.evidenceOriginal || "Não informada"}\nObservações adicionais: ${item.observation || "Não informadas"}\nReferências normativas validadas (use apenas se pertinentes):\n${referenceText}\n\nElabore somente a constatação técnica no formato solicitado.`, max_output_tokens: 1100, temperature: 0.15, store: false }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const code = typeof body?.error?.code === "string" ? body.error.code : undefined;
        console.warn("[technical-audit-ai] OpenAI failure", { status: response.status, code });
        throw new TechnicalAuditAiError(providerMessage(response.status, body));
      }
      const analysis = clean(outputText(body));
      if (!analysis) throw new TechnicalAuditAiError("A IA não retornou uma análise válida. Tente novamente.");
      return { analysis, references };
    } catch (error) {
      if (error instanceof TechnicalAuditAiError) throw error;
      throw new TechnicalAuditAiError("Não foi possível concluir a análise por IA neste momento. Os dados da auditoria estão preservados. Tente novamente.");
    } finally { clearTimeout(timer); }
  }

  async synthesize(summary: TechnicalReportSummary, items: TechnicalReportItem[]) {
    const positives = items.filter((item) => item.classification === "Conforme" && item.analysisFinal).slice(0, 4).map((item) => item.analysisFinal);
    const critical = items.filter((item) => item.classification === "Não conforme" && item.analysisFinal).slice(0, 5).map((item) => item.analysisFinal);
    return {
      ...summary,
      generalOpinion: `Durante a auditoria interna, foram avaliados ${summary.total} requisitos: ${summary.conforming} conforme(s) (${summary.conformityPercentage}%), ${summary.nonConforming} não conforme(s) (${summary.nonConformityPercentage}%) e ${summary.notApplicable} não aplicável(eis). O parecer foi consolidado a partir das classificações e constatações registradas, devendo ser validado pelo auditor responsável antes da emissão definitiva.`,
      positivePoints: positives.length ? positives : ["Não foram registradas evidências suficientes para destacar pontos positivos adicionais."],
      criticalPoints: critical.length ? critical : ["Não foram identificados pontos críticos classificados como não conformes."],
      improvementPoints: critical.length ? critical.map((text) => `Recomenda-se acompanhar o achado relacionado a: ${text}`) : ["Manter o monitoramento periódico dos requisitos avaliados."]
    };
  }
}
