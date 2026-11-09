/** Primeiro objeto JSON do texto (alguns modelos põem texto ou ``` em volta). Usado no servidor e no navegador. */
export function firstJson(text: string): Record<string, unknown> | null {
  const t = text.replace(/```(?:json)?/g, "");
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try { const j = JSON.parse(t.slice(a, b + 1)); return j && typeof j === "object" ? j : null; } catch { return null; }
}
