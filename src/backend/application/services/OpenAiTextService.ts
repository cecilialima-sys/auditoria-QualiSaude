export class OpenAiTextError extends Error {
  constructor(message: string, readonly status = 503) {
    super(message);
  }
}

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  error?: { code?: string; message?: string };
};

function extractText(response: OpenAiResponse) {
  if (typeof response.output_text === "string") return response.output_text.trim();
  return (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text ?? "")
    .join("\n")
    .trim();
}

function errorMessage(status: number, response: OpenAiResponse | null) {
  const code = response?.error?.code ?? "";
  if (status === 429) {
    return code === "insufficient_quota"
      ? "Os créditos disponíveis para a IA foram esgotados. Verifique o faturamento da integração e tente novamente."
      : "A IA atingiu o limite temporário de uso. Aguarde alguns instantes e tente novamente.";
  }
  if (status === 401 || status === 403) return "A configuração da IA OpenAI foi recusada. Verifique a chave cadastrada no servidor.";
  if (status === 400 || status === 404) return "A configuração do modelo OpenAI não foi aceita. Verifique o modelo cadastrado no servidor.";
  return "A IA OpenAI está temporariamente indisponível. Você pode continuar utilizando a evidência original.";
}

/** Cliente exclusivo do servidor para a Responses API da OpenAI. */
export async function generateOpenAiText(input: {
  instruction: string;
  prompt: string;
  maxOutputTokens: number;
}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new OpenAiTextError("A IA OpenAI ainda não está configurada. Você pode continuar utilizando a evidência original.");

  const timeout = Math.max(5_000, Number(process.env.OPENAI_AI_TIMEOUT_MS || 30_000));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || "gpt-5-mini",
        instructions: input.instruction,
        input: input.prompt,
        max_output_tokens: input.maxOutputTokens,
        store: false
      })
    });
    const body = await response.json().catch(() => null) as OpenAiResponse | null;
    if (!response.ok) {
      console.warn("[openai-audit-ai] OpenAI failure", { status: response.status, code: body?.error?.code });
      throw new OpenAiTextError(errorMessage(response.status, body), response.status);
    }
    const text = body ? extractText(body) : "";
    if (!text) throw new OpenAiTextError("A IA OpenAI não retornou um texto válido. Tente novamente.", 502);
    return text;
  } catch (error) {
    if (error instanceof OpenAiTextError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") throw new OpenAiTextError("A IA OpenAI demorou mais que o esperado. Tente novamente ou continue com a evidência original.");
    console.error("[openai-audit-ai] Unexpected failure", error instanceof Error ? error.message : error);
    throw new OpenAiTextError("A IA OpenAI está temporariamente indisponível. Você pode continuar utilizando a evidência original.");
  } finally {
    clearTimeout(timer);
  }
}
