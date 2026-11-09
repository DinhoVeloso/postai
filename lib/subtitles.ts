// Divide as falas em pedaços curtos (estilo reels): no máximo ~5 palavras por vez.
import type { Segment } from "./types";

export function splitSegments(segs: Segment[], maxWords = 5): Segment[] {
  const out: Segment[] = [];
  for (const s of segs) {
    const words = s.text.split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) { out.push(s); continue; }
    const parts = Math.ceil(words.length / maxWords);
    const per = Math.ceil(words.length / parts);
    const total = words.join("").length || 1;
    let t = s.start, used = 0;
    for (let i = 0; i < words.length; i += per) {
      const chunk = words.slice(i, i + per);
      used += chunk.join("").length;
      const end = s.start + ((s.end - s.start) * used) / total; // tempo proporcional ao tamanho das palavras
      out.push({ start: t, end, text: chunk.join(" ") });
      t = end;
    }
  }
  return out;
}

export const transcriptText = (segs: Segment[]) => segs.map((s) => `[${s.start.toFixed(1)}–${s.end.toFixed(1)}s] ${s.text}`).join("\n");
