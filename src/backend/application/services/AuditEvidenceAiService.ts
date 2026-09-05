export type EvidenceImprovementInput = {
  checklistTitle: string;
  itemNumber?: string;
  itemText: string;
  status: "Conforme" | "Não conforme" | "Não se aplica";
  evidenceOriginal: string;
  style?: "professional" | "objective" | "detailed" | "technical" | "formal";
};

export class EvidenceAiError extends Error {
  constructor(message: string, readonly status = 503) {
    super(message);
    this.name = "EvidenceAiError";
  }
}

const SYSTEM_INSTRUCTIONS = `Você é um assistente especializado em redação técnica de relatórios de auditoria hospitalar. Sua função é aprimorar a redação da evidência fornecida, tornando o texto claro, profissional, coeso, objetivo e apropriado para um relatório formal.

Use exclusivamente as informações fornecidas pelo auditor. É proibido inventar, presumir ou acrescentar fatos, datas, documentos, pessoas, locais, equipamentos, causas, consequências, conclusões ou evidências que não estejam no texto original ou no contexto explicitamente enviado. Não altere o significado, a classificação ou a gravidade da evidência. Não transforme suposições em afirmações. Não crie recomendações, planos de ação ou soluções. Se a evidência for curta, amplie somente sua organização e redação, sem criar novos fatos. Produza somente um texto em português do Brasil, em parágrafo, sem título, lista, HTML ou observações sobre sua resposta.`;

function styleInstruction(style: EvidenceImprovementInput["style"]) {
  const styles = {
    professional: "Use tom profissional e detalhamento moderado.",
    objective: "Mantenha a redação concisa e objetiva.",
    detailed: "Organize melhor os detalhes existentes, sem acrescentar fatos.",
    technical: "Use terminologia técnica clara, sem tornar o texto hermético.",
    formal: "Use redação formal apropriada para documento institucional."
  } as const;
  return styles[style ?? "professional"];
}

export function buildEvidenceImprovementPrompt(input: EvidenceImprovementInput) {
  return [
    `Checklist: ${input.checklistTitle}`,
    `Item: ${input.itemNumber ? `${input.itemNumber} – ` : ""}${input.itemText}`,
    `Classificação registrada: ${input.status}`,
    `Evidência original: ${input.evidenceOriginal.trim()}`,
    styleInstruction(input.style),
    "Reescreva apenas a evidência original."
  ].join("\n\n");
}

export function sanitizeEvidenceSuggestion(value: string) {
  const plainText = value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!plainText) throw new EvidenceAiError("A IA não retornou uma sugestão de texto válida.", 502);
  if (plainText.length > 8_000) throw new EvidenceAiError("A sugestão retornada excede o limite permitido.", 502);
  return plainText;
}

function responseText(data: unknown) {
  const response = data as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  if (typeof response.output_text === "string") return response.output_text;
  return (response.output ?? [])
    .flatMap((output) => output.content ?? [])
    .filter((content) => content.type === "output_text")
    .map((content) => content.text ?? "")
    .join("\n");
}

export class AuditEvidenceAiService {
  async improveEvidence(input: EvidenceImprovementInput) {
    const evidenceOriginal = input.evidenceOriginal.trim();
    if (!evidenceOriginal) throw new EvidenceAiError("Adicione uma evidência antes de utilizar a melhoria por IA.", 400);

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new EvidenceAiError("A melhoria por IA ainda não está configurada. Você pode continuar usando a evidência original.");
    }

    const controller = new AbortController();
    const timeout = Math.max(5_000, Number(process.env.OPENAI_AI_TIMEOUT_MS || 20_000));
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL?.trim() || "gpt-5-mini",
          instructions: SYSTEM_INSTRUCTIONS,
          input: buildEvidenceImprovementPrompt({ ...input, evidenceOriginal }),
          max_output_tokens: 500,
          store: false
        }),
        signal: controller.signal
      });

      const body = await response.json().catch(() => null);
      if (!response.ok) {
        console.error("[audit-evidence-ai] OpenAI request failed", { status: response.status });
        throw new EvidenceAiError("A melhoria por IA está temporariamente indisponível. Você pode continuar utilizando a evidência original.");
      }

      return sanitizeEvidenceSuggestion(responseText(body));
    } catch (error) {
      if (error instanceof EvidenceAiError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new EvidenceAiError("A melhoria por IA demorou mais que o esperado. Tente novamente ou continue com a evidência original.");
      }
      console.error("[audit-evidence-ai] Unexpected failure", error instanceof Error ? error.message : error);
      throw new EvidenceAiError("A melhoria por IA está temporariamente indisponível. Você pode continuar utilizando a evidência original.");
    } finally {
      clearTimeout(timer);
    }
  }
}
