// Transcreve as falas do vídeo (Groq Whisper, gratuito) para gerar legendas na tela.
import { experimental_transcribe as transcribe } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { rateLimited } from "@/lib/ai/limit";

export const maxDuration = 90;

export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY) return Response.json({ error: "Transcrição precisa da chave GROQ_API_KEY." }, { status: 503 });
  if (rateLimited(req, "transcribe", 30)) return Response.json({ error: "Limite de transcrições por hora atingido." }, { status: 429 });
  const form = await req.formData();
  const file = form.get("audio");
  if (!(file instanceof Blob) || file.size === 0) return Response.json({ error: "Áudio não enviado." }, { status: 400 });
  if (file.size > 4_000_000) return Response.json({ error: "Áudio longo demais (máx. ~15 min)." }, { status: 413 });
  try {
    const r = await transcribe({
      model: createGroq({ apiKey: process.env.GROQ_API_KEY }).transcription("whisper-large-v3-turbo"),
      audio: new Uint8Array(await file.arrayBuffer()),
      providerOptions: { groq: { language: "pt", responseFormat: "verbose_json", timestampGranularities: ["segment"] } },
      abortSignal: AbortSignal.timeout(60_000),
    });
    const segments = (r.segments ?? []).map((s) => ({ start: s.startSecond, end: s.endSecond, text: s.text.trim() })).filter((s) => s.text);
    return Response.json({ text: r.text, segments });
  } catch (e) {
    console.error("transcribe", e);
    return Response.json({ error: "Não foi possível transcrever agora. Tente de novo em instantes." }, { status: 502 });
  }
}
