import type { NormativeReference, TechnicalReportItem, TechnicalReportSummary } from "@/backend/application/reports/technicalAuditReportTypes";

export class TechnicalAuditAiError extends Error {}

const INSTRUCTIONS = `Você é um Enfermeiro Auditor Sênior especializado em auditoria hospitalar, qualidade assistencial, segurança do paciente e gestão de riscos. Elabore uma constatação técnica em português brasileiro formal, clara e proporcional, pronta para um Relatório de Auditoria Interna. Use exclusivamente o requisito, a classificação e as evidências fornecidas. Nunca invente entrevistas, documentos, datas, nomes, normas, procedimentos, consequências, causas ou ações. Não altere a classificação. Diferencie evidência de interpretação e use “não foi evidenciado” quando algo não foi apresentado. Só mencione referência normativa específica se ela vier previamente validada no contexto; caso contrário, não cite números de normas. Não use HTML, listas, títulos, nem linguagem acusatória.`;

function outputText(body: any) {
  if (typeof body?.output_text === "string") return body.output_text;
  return (body?.output ?? []).flatMap((item: any) => item.content ?? []).filter((item: any) => item.type === "output_text").map((item: any) => item.text ?? "").join("\n");
}
function clean(value: string) { return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 12000); }

export class TechnicalAuditAiService {
  async analyzeItem(context: { sector: string; auditType: string; normativeReference: string; item: TechnicalReportItem }) {
    const { item } = context;
    const evidence = [item.evidenceOriginal, item.observation].filter(Boolean).join("\nObservações: ");
    if (!evidence.trim()) return { analysis: "Não foi registrada evidência ou observação complementar para este requisito. Recomenda-se revisão pelo auditor antes da emissão do relatório.", references: [] as NormativeReference[] };
    const key = process.env.OPENAI_API_KEY?.trim();
    if (!key) throw new TechnicalAuditAiError("A análise técnica por IA ainda não está configurada. Os dados da auditoria foram preservados.");
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), Math.max(5000, Number(process.env.OPENAI_AI_TIMEOUT_MS || 30000)));
    try {
      const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, signal: controller.signal, body: JSON.stringify({ model: process.env.OPENAI_MODEL?.trim() || "gpt-5-mini", instructions: INSTRUCTIONS, input: `Setor: ${context.sector}\nTipo de auditoria: ${context.auditType}\nNorma/checklist de referência: ${context.normativeReference}\nNúmero do requisito: ${item.number}\nRequisito: ${item.requirement}\nClassificação definida pelo auditor: ${item.classification}\nEvidência original do auditor: ${item.evidenceOriginal || "Não informada"}\nObservações adicionais: ${item.observation || "Não informadas"}\n\nElabore apenas a constatação técnica.`, max_output_tokens: 700, temperature: 0.2, store: false }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) { console.warn("[technical-audit-ai] OpenAI failure", { status: response.status }); throw new TechnicalAuditAiError("Não foi possível concluir a análise por IA neste momento. Os dados da auditoria estão preservados. Tente novamente."); }
      const analysis = clean(outputText(body));
      if (!analysis) throw new TechnicalAuditAiError("A IA não retornou uma análise válida. Tente novamente.");
      return { analysis, references: [] as NormativeReference[] };
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
