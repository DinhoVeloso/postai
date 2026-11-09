// Pede um JSON à IA tentando os provedores gratuitos em ordem (se um falhar ou responder fora do formato, tenta o próximo).
import { generateText } from "ai";
import { availableProviders, PROVIDER_LABEL } from "./providers";

export async function generateJson<T>(system: string, prompt: string, parse: (text: string) => T | null, temperature = 0.7) {
  const providers = availableProviders();
  if (!providers.length) return { error: "Nenhuma chave de IA configurada (GROQ_API_KEY, GEMINI_API_KEY ou OPENROUTER_API_KEY).", status: 503 } as const;
  const failures: string[] = [];
  for (const p of providers) {
    try {
      const r = await generateText({ model: p.make(), system, prompt, temperature, maxRetries: 0, abortSignal: AbortSignal.timeout(40_000) });
      const data = parse(r.text);
      if (!data) { failures.push(`${PROVIDER_LABEL[p.id]}: resposta fora do formato`); continue; }
      return { data, provider: PROVIDER_LABEL[p.id], model: p.model } as const;
    } catch (e) {
      failures.push(`${PROVIDER_LABEL[p.id]}: ${e instanceof Error ? e.message : String(e)}`.slice(0, 200));
    }
  }
  console.error("IA: todos os provedores falharam", failures);
  return { error: "A IA gratuita não respondeu agora (limite de uso ou indisponibilidade). Tente em alguns minutos.", status: 502 } as const;
}

export { firstJson } from "./first-json";
