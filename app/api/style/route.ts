// Cria um estilo a partir de uma inspiração ("posts como os de fulano", "estilo revista de moda").
import { firstJson, generateJson } from "@/lib/ai/json";
import { rateLimited } from "@/lib/ai/limit";

export const maxDuration = 120;

const SYSTEM = `Você é um diretor de arte e social media brasileiro. O usuário descreve uma inspiração (um criador famoso, uma marca, uma estética).
Descreva o ESTILO de edição e de escrita dos posts dessa inspiração: ritmo, enquadramento, cores, tipografia, tom da legenda, ganchos típicos.
Não descreva a pessoa fisicamente e não sugira usar nome, rosto ou voz dela: é só o jeito de editar e escrever.
Se não conhecer a inspiração, diga isso na descrição e monte um estilo plausível a partir das palavras do usuário.
Responda SOMENTE com JSON:
Tudo em português do Brasil.
{"name": "nome curto do estilo em português, 2–4 palavras (sem o nome da pessoa)", "description": "3–5 frases sobre como são os posts", "captionTone": "tom da legenda em poucas palavras",
 "hashtagCount": 3–8, "aspect": "4:5"|"9:16"|"1:1", "speed": 0.9–1.25, "subtitles": true|false,
 "adjust": {"brightness": 0.8–1.2, "contrast": 0.8–1.4, "saturation": 0.6–1.4, "warmth": -0.5–0.5, "vignette": 0–0.6},
 "text": {"font": "sans"|"serif"|"display"|"hand", "color": "#rrggbb", "bg": "none"|"shadow"|"outline"|"box", "bgColor": "#rrggbb", "bold": true|false, "upper": true|false}}`;

export async function POST(req: Request) {
  if (rateLimited(req, "style", 20)) return Response.json({ error: "Limite de pedidos por hora atingido." }, { status: 429 });
  const { inspiration } = (await req.json()) as { inspiration?: string };
  if (!inspiration?.trim()) return Response.json({ error: "Descreva a inspiração." }, { status: 400 });
  const r = await generateJson(SYSTEM, `Inspiração: ${inspiration.slice(0, 300)}`, (t) => { const j = firstJson(t); return j && typeof j.description === "string" ? j : null; });
  if ("error" in r) return Response.json({ error: r.error }, { status: r.status });
  return Response.json(r.data);
}
