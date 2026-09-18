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

import { GeminiTextError, generateGeminiText } from "./GeminiTextService";

const SYSTEM_INSTRUCTIONS = `Você é um Enfermeiro Auditor Sênior especializado em auditoria hospitalar, qualidade assistencial, segurança do paciente e gestão de riscos. Sua única tarefa é reescrever a evidência registrada pelo auditor em português brasileiro técnico, claro, coeso, objetivo e formal.

REGRAS INEGOCIÁVEIS:
1. Use exclusivamente fatos explicitamente informados na evidência original. O checklist serve apenas para compreender o assunto, nunca como prova de que algo ocorreu.
2. É proibido criar, supor ou completar datas, nomes, cargos, documentos, registros, equipamentos, locais, entrevistas, causas, consequências, resultados, normas, leis, recomendações ou ações corretivas.
3. Não cite legislação ou número de norma. Não altere a classificação, a gravidade, o sentido ou o grau de certeza do registro.
4. Se a evidência usar termos como “não apresentou”, “informou”, “aparenta” ou “sem documento”, preserve o mesmo grau de certeza: escreva “não foi apresentado”, “foi informado” ou equivalente; não transforme em fato comprovado.
5. Não acrescente conclusão técnica, diagnóstico, recomendação, plano de ação ou juízo de valor.
6. Se houver pouca informação, melhore apenas gramática, pontuação e organização; não aumente artificialmente o texto.

Produza somente um único parágrafo em texto puro, sem título, lista, HTML, introduções nem observações sobre a resposta.`;

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

export class AuditEvidenceAiService {
  async improveEvidence(input: EvidenceImprovementInput) {
    const evidenceOriginal = input.evidenceOriginal.trim();
    if (!evidenceOriginal) throw new EvidenceAiError("Adicione uma evidência antes de utilizar a melhoria por IA.", 400);

    try {
      const suggestion = await generateGeminiText({
        instruction: SYSTEM_INSTRUCTIONS,
        prompt: buildEvidenceImprovementPrompt({ ...input, evidenceOriginal }),
        maxOutputTokens: 500
      });
      return sanitizeEvidenceSuggestion(suggestion);
    } catch (error) {
      if (error instanceof EvidenceAiError) throw error;
      if (error instanceof GeminiTextError) throw new EvidenceAiError(error.message, error.status);
      throw new EvidenceAiError("A IA Gemini está temporariamente indisponível. Você pode continuar utilizando a evidência original.");
    }
  }
}
