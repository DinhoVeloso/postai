import { editSystemPrompt, type EditRequest } from "@/lib/ai/edit-prompt";
import { parseAiResult } from "@/lib/ai/edit-schema";
import { generateJson } from "@/lib/ai/json";
import { rateLimited } from "@/lib/ai/limit";

export const maxDuration = 120;

export async function POST(req: Request) {
  if (rateLimited(req, "edit", 60)) return Response.json({ error: "Limite de pedidos por hora atingido. Tente mais tarde." }, { status: 429 });
  const body = (await req.json()) as EditRequest;
  if (!body?.media || !body.spec) return Response.json({ error: "Pedido incompleto." }, { status: 400 });
  const prompt = body.prompt?.trim() || (body.mode === "caption" ? "Escreva a legenda e as hashtags para este post." : "Edite esta mídia para o objetivo e o estilo escolhidos e escreva a legenda.");
  const r = await generateJson(editSystemPrompt(body), prompt, (t) => { const p = parseAiResult(t); return p && (p.caption || p.edit) ? p : null; });
  if ("error" in r) return Response.json({ error: r.error }, { status: r.status });
  return Response.json({ ...r.data, provider: r.provider, model: r.model });
}
