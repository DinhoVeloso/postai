// Formato da resposta da IA e como ela vira uma edição (validado e limitado aqui, a IA pode errar).
import { uid } from "@/lib/db";
import { firstJson } from "./first-json";
import type { Aspect, EditSpec, FontId, Media, Style, TextBg, TextLayer } from "@/lib/types";

export type AiText = { text: string; position?: "top" | "middle" | "bottom"; size?: "s" | "m" | "l"; start?: number | null; end?: number | null; font?: FontId; color?: string; bg?: TextBg; bgColor?: string; upper?: boolean };
export type AiEdit = {
  aspect?: Aspect; zoom?: number; focusY?: number;
  adjust?: Partial<EditSpec["adjust"]>;
  texts?: AiText[]; trim?: { start?: number; end?: number | null }; speed?: number; mute?: boolean; subtitles?: boolean;
};
export type AiResult = { explanation: string; edit: AiEdit | null; caption: string; hashtags: string[]; hooks: string[] };

export const AI_FORMAT = `Responda SOMENTE com um objeto JSON (sem texto fora dele, sem \`\`\`), neste formato:
{
  "explanation": "1–3 frases em português explicando o que você fez e por quê",
  "edit": null ou {
    "aspect": "original"|"1:1"|"4:5"|"9:16"|"16:9",
    "zoom": 1 a 3, "focusY": 0 (topo) a 1 (base) — onde centralizar o recorte,
    "adjust": {"brightness": 0.6–1.5 (1=original), "contrast": 0.6–1.6, "saturation": 0–2, "warmth": -1 (frio) a 1 (quente), "vignette": 0–1},
    "texts": [{"text": "curto", "position": "top"|"middle"|"bottom", "size": "s"|"m"|"l", "start": segundos ou null, "end": segundos ou null, "font": "sans"|"serif"|"display"|"hand", "color": "#rrggbb", "bg": "none"|"shadow"|"outline"|"box", "bgColor": "#rrggbb", "upper": true|false}],
    "trim": {"start": segundos, "end": segundos ou null},   // só vídeo
    "speed": 0.5–2,                                         // só vídeo
    "mute": false,                                          // só vídeo
    "subtitles": true|false                                 // só vídeo: legendas automáticas das falas
  },
  "caption": "legenda completa do post (com quebras de linha \\n e emojis se o estilo pedir)",
  "hashtags": ["semjogodavelha", "..."],
  "hooks": ["3 ganchos alternativos curtos para o começo do vídeo ou a capa"]
}
Em "edit", inclua só o que deve mudar. "texts" substitui todos os textos atuais (mande [] para remover). Tempos de texto são do vídeo FINAL (depois do corte e da velocidade).`;

const clamp = (v: unknown, lo: number, hi: number, fb: number) => (typeof v === "number" && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fb);
const color = (v: unknown, fb: string) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : fb);
const ASPECTS: Aspect[] = ["original", "1:1", "4:5", "9:16", "16:9"];
const FONTS: FontId[] = ["sans", "serif", "display", "hand"];
const BGS: TextBg[] = ["none", "shadow", "outline", "box"];

/** Aplica a edição sugerida sobre a atual, respeitando limites e o tipo de mídia. */
export function applyAiEdit(spec: EditSpec, e: AiEdit | null, m: Media, style: Style | null): EditSpec {
  if (!e || typeof e !== "object") return spec;
  const s: EditSpec = structuredClone(spec);
  if (e.aspect && ASPECTS.includes(e.aspect)) s.aspect = e.aspect;
  if (e.zoom != null) s.zoom = clamp(e.zoom, 1, 3, s.zoom);
  if (e.focusY != null) s.focusY = clamp(e.focusY, 0, 1, s.focusY);
  if (e.adjust) {
    const a = e.adjust;
    s.adjust = {
      brightness: clamp(a.brightness, 0.6, 1.5, s.adjust.brightness), contrast: clamp(a.contrast, 0.6, 1.6, s.adjust.contrast),
      saturation: clamp(a.saturation, 0, 2, s.adjust.saturation), warmth: clamp(a.warmth, -1, 1, s.adjust.warmth), vignette: clamp(a.vignette, 0, 1, s.adjust.vignette),
    };
  }
  const isVideo = m.kind === "video";
  if (isVideo) {
    if (e.speed != null) s.speed = clamp(e.speed, 0.5, 2, s.speed);
    if (e.trim) {
      const start = clamp(e.trim.start, 0, Math.max(0, m.duration - 0.5), s.trim.start);
      const end = e.trim.end == null ? null : clamp(e.trim.end, start + 0.5, m.duration, m.duration);
      s.trim = { start, end: end != null && end >= m.duration - 0.05 ? null : end };
    }
    if (typeof e.mute === "boolean") s.mute = e.mute;
    if (typeof e.subtitles === "boolean") s.subtitles.enabled = e.subtitles;
  }
  if (Array.isArray(e.texts)) {
    const st = style?.text;
    const reels = s.aspect === "9:16";
    s.texts = e.texts.filter((t) => t && typeof t.text === "string" && t.text.trim()).slice(0, 6).map((t): TextLayer => ({
      id: uid(),
      text: t.text.trim().slice(0, 160),
      x: 0.5,
      // reels/story: fora das áreas cobertas pela interface do app
      y: t.position === "top" ? (reels ? 0.17 : 0.1) : t.position === "bottom" ? (reels ? 0.72 : 0.88) : 0.5,
      size: t.size === "s" ? 0.045 : t.size === "l" ? 0.1 : 0.065,
      font: t.font && FONTS.includes(t.font) ? t.font : st?.font ?? "sans",
      color: color(t.color, st?.color ?? "#ffffff"),
      bg: t.bg && BGS.includes(t.bg) ? t.bg : st?.bg ?? "shadow",
      bgColor: color(t.bgColor, st?.bgColor ?? "#000000"),
      bold: st?.bold ?? true,
      upper: typeof t.upper === "boolean" ? t.upper : st?.upper ?? false,
      start: isVideo && typeof t.start === "number" ? Math.max(0, t.start) : null,
      end: isVideo && typeof t.end === "number" ? Math.max(0, t.end) : null,
    }));
  }
  return s;
}

/** Aplica um estilo pronto (cor, formato, fonte dos textos atuais). */
export function applyStyle(spec: EditSpec, st: Style, m: Media): EditSpec {
  const s: EditSpec = structuredClone(spec);
  s.adjust = { ...st.adjust };
  s.aspect = m.kind === "image" && st.aspect === "9:16" ? "4:5" : st.aspect;
  s.texts = s.texts.map((t) => ({ ...t, ...st.text }));
  if (m.kind === "video") {
    s.speed = st.speed;
    s.subtitles.enabled = st.subtitles || s.subtitles.enabled;
    s.subtitles.style = { ...s.subtitles.style, font: st.text.font, color: st.text.bg === "box" ? st.text.color : "#ffffff", bg: st.text.bg === "none" ? "outline" : st.text.bg, bgColor: st.text.bgColor, upper: st.text.upper };
  }
  return s;
}

/** Tenta ler o JSON da resposta (alguns modelos põem texto ou ``` em volta). */
export function parseAiResult(text: string): AiResult | null {
  const j = firstJson(text);
  if (!j) return null;
  return {
    explanation: typeof j.explanation === "string" ? j.explanation : "",
    edit: j.edit && typeof j.edit === "object" ? (j.edit as AiEdit) : null,
    // Instagram/TikTok não mostram markdown; hashtags ficam no campo próprio
    caption: typeof j.caption === "string" ? j.caption.replace(/\*\*(.+?)\*\*/g, "$1").replace(/(?:\s*#[\p{L}\p{N}_]+)+\s*$/u, "").trim() : "",
    hashtags: Array.isArray(j.hashtags) ? j.hashtags.map((h: unknown) => String(h).replace(/^#/, "").replace(/\s+/g, "")).filter(Boolean).slice(0, 15) : [],
    hooks: Array.isArray(j.hooks) ? j.hooks.map(String).slice(0, 5) : [],
  };
}
