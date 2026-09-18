export class GeminiTextError extends Error {
  constructor(message: string, readonly status = 503) {
    super(message);
  }
}

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { code?: number; message?: string; status?: string };
};

function extractText(response: GeminiResponse) {
  return (response.candidates ?? [])
    .flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();
}

function errorMessage(status: number, response: GeminiResponse | null) {
  const providerMessage = response?.error?.message?.toLowerCase() ?? "";
  if (status === 401 || status === 403) return "A configuração da IA Gemini foi recusada. Verifique a chave cadastrada no servidor.";
  if (status === 429 || providerMessage.includes("quota")) return "A cota da IA Gemini foi atingida. Verifique a cota e o faturamento do projeto Gemini e tente novamente.";
  if (status === 400 || status === 404) return "A configuração do modelo Gemini não foi aceita. Verifique o modelo cadastrado no servidor.";
  return "A IA Gemini está temporariamente indisponível. Você pode continuar utilizando a evidência original.";
}

/**
 * Cliente único, exclusivo do servidor, para textos de auditoria. A chave nunca
 * chega ao navegador: ela é lida somente do ambiente de execução do Render.
 */
export async function generateGeminiText(input: {
  instruction: string;
  prompt: string;
  maxOutputTokens: number;
  responseMimeType?: "application/json";
}) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new GeminiTextError("A IA Gemini ainda não está configurada. Você pode continuar utilizando a evidência original.");

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";
  const timeout = Math.max(5_000, Number(process.env.GEMINI_AI_TIMEOUT_MS || 30_000));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: input.instruction }] },
        contents: [{ role: "user", parts: [{ text: input.prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: input.maxOutputTokens,
          ...(input.responseMimeType ? { responseMimeType: input.responseMimeType } : {})
        }
      })
    });
    const body = await response.json().catch(() => null) as GeminiResponse | null;
    if (!response.ok) {
      console.warn("[gemini-audit-ai] Gemini failure", { status: response.status, code: body?.error?.status });
      throw new GeminiTextError(errorMessage(response.status, body), response.status);
    }
    const text = body ? extractText(body) : "";
    if (!text) throw new GeminiTextError("A IA Gemini não retornou um texto válido. Tente novamente.", 502);
    return text;
  } catch (error) {
    if (error instanceof GeminiTextError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") throw new GeminiTextError("A IA Gemini demorou mais que o esperado. Tente novamente ou continue com a evidência original.");
    console.error("[gemini-audit-ai] Unexpected failure", error instanceof Error ? error.message : error);
    throw new GeminiTextError("A IA Gemini está temporariamente indisponível. Você pode continuar utilizando a evidência original.");
  } finally {
    clearTimeout(timer);
  }
}
