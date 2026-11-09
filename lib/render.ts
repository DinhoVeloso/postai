// Desenho de um quadro (foto ou vídeo) com recorte, ajustes de cor, vinheta, textos e legendas.
// A mesma função faz a prévia na tela e a foto final; o vídeo final usa as mesmas contas no ffmpeg.
import { FONT_FAMILY } from "./fonts";
import type { Aspect, EditSpec, Media, SubtitleStyle, TextLayer } from "./types";

export const ASPECTS: { id: Aspect; label: string; ratio: number | null }[] = [
  { id: "original", label: "Original", ratio: null },
  { id: "1:1", label: "1:1 quadrado", ratio: 1 },
  { id: "4:5", label: "4:5 feed", ratio: 4 / 5 },
  { id: "9:16", label: "9:16 reels/story", ratio: 9 / 16 },
  { id: "16:9", label: "16:9 deitado", ratio: 16 / 9 },
];

export const DEFAULT_SUB_STYLE: SubtitleStyle = { font: "sans", color: "#ffffff", bg: "outline", bgColor: "#000000", y: 0.72, size: 0.06, upper: false };

export function defaultSpec(m: Pick<Media, "kind" | "duration">): EditSpec {
  return {
    aspect: m.kind === "video" ? "9:16" : "4:5",
    zoom: 1, focusX: 0.5, focusY: 0.5,
    adjust: { brightness: 1, contrast: 1, saturation: 1, warmth: 0, vignette: 0 },
    texts: [],
    trim: { start: 0, end: null },
    speed: 1,
    mute: false,
    subtitles: { enabled: false, segments: [], style: DEFAULT_SUB_STYLE },
  };
}

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

/** Tamanho final: `short` é o lado menor (1080 foto, 720/1080 vídeo). */
export function outputSize(spec: EditSpec, srcW: number, srcH: number, short: number) {
  const r = ASPECTS.find((a) => a.id === spec.aspect)?.ratio ?? srcW / srcH;
  return r >= 1 ? { w: even(short * r), h: even(short) } : { w: even(short), h: even(short / r) };
}

/** Pedaço da mídia original que aparece no quadro (pixels da original). */
export function cropRect(spec: EditSpec, srcW: number, srcH: number, outW: number, outH: number) {
  const r = outW / outH;
  let w = srcW, h = srcW / r;
  if (h > srcH) { h = srcH; w = srcH * r; }
  w /= spec.zoom; h /= spec.zoom;
  const x = Math.min(Math.max(spec.focusX * srcW - w / 2, 0), srcW - w);
  const y = Math.min(Math.max(spec.focusY * srcH - h / 2, 0), srcH - h);
  return { x, y, w, h };
}

/** Multiplicadores de cor da temperatura (os mesmos usados no ffmpeg). */
export function warmthMul(w: number) {
  const a = Math.abs(w);
  return w >= 0 ? { r: 1, g: 1 - 0.06 * a, b: 1 - 0.18 * a } : { r: 1 - 0.18 * a, g: 1 - 0.06 * a, b: 1 };
}

// ---------- linha do tempo do vídeo ----------
export const trimEnd = (spec: EditSpec, duration: number) => Math.min(spec.trim.end ?? duration, duration);
export const outDuration = (spec: EditSpec, duration: number) => Math.max(0, (trimEnd(spec, duration) - spec.trim.start) / spec.speed);
export const srcToOut = (spec: EditSpec, t: number) => (t - spec.trim.start) / spec.speed;

/** Legendas no tempo do vídeo final. */
export function subtitleWindows(spec: EditSpec, duration: number) {
  if (!spec.subtitles.enabled) return [];
  const end = outDuration(spec, duration);
  return spec.subtitles.segments
    .map((s) => ({ start: Math.max(0, srcToOut(spec, s.start)), end: Math.min(end, srcToOut(spec, s.end)), text: s.text }))
    .filter((s) => s.end > s.start + 0.05 && s.text.trim());
}

type Box = { id: string; x0: number; y0: number; x1: number; y1: number };

/**
 * Desenha um quadro. `t` = segundo no vídeo final (null = foto, mostra todos os textos).
 * `layers`: "all" (mídia + efeitos), "overlay" (só vinheta e textos, fundo transparente).
 */
export function drawFrame(
  ctx: CanvasRenderingContext2D, source: CanvasImageSource | null, srcW: number, srcH: number,
  spec: EditSpec, W: number, H: number, t: number | null, duration = 0, opts: { only?: (l: TextLayer) => boolean; skipVignette?: boolean; subtitles?: boolean } = {},
): Box[] {
  ctx.clearRect(0, 0, W, H);
  if (source) {
    const c = cropRect(spec, srcW, srcH, W, H);
    const a = spec.adjust;
    ctx.filter = a.brightness !== 1 || a.contrast !== 1 || a.saturation !== 1 ? `brightness(${a.brightness}) contrast(${a.contrast}) saturate(${a.saturation})` : "none";
    ctx.drawImage(source, c.x, c.y, c.w, c.h, 0, 0, W, H);
    ctx.filter = "none";
    if (a.warmth) {
      const m = warmthMul(a.warmth);
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = `rgb(${255 * m.r},${255 * m.g},${255 * m.b})`;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";
    }
  }
  if (spec.adjust.vignette > 0 && !opts.skipVignette) drawVignette(ctx, W, H, spec.adjust.vignette);

  const boxes: Box[] = [];
  for (const l of spec.texts) {
    if (opts.only && !opts.only(l)) continue;
    if (t !== null && ((l.start != null && t < l.start) || (l.end != null && t >= l.end))) continue;
    boxes.push(drawText(ctx, l, W, H));
  }
  if (opts.subtitles !== false && t !== null) {
    const s = subtitleWindows(spec, duration).find((w) => t >= w.start && t < w.end);
    if (s) drawText(ctx, subtitleLayer(spec.subtitles.style, s.text), W, H);
  }
  return boxes;
}

export function drawVignette(ctx: CanvasRenderingContext2D, W: number, H: number, v: number) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) / 2);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${0.75 * v})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

export function subtitleLayer(st: SubtitleStyle, text: string): TextLayer {
  return { id: "sub", text, x: 0.5, y: st.y, size: st.size, color: st.color, bg: st.bg, bgColor: st.bgColor, font: st.font, bold: true, upper: st.upper };
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/)) {
      const tryLine = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(tryLine).width > max) { out.push(line); line = word; } else line = tryLine;
    }
    out.push(line);
  }
  return out;
}

export function drawText(ctx: CanvasRenderingContext2D, l: TextLayer, W: number, H: number): Box {
  const px = Math.max(8, l.size * W);
  const weight = l.bold && l.font !== "display" ? 700 : 400;
  ctx.font = `${weight} ${px}px ${FONT_FAMILY[l.font]}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const text = l.upper ? l.text.toUpperCase() : l.text;
  const lines = wrap(ctx, text, W * 0.88);
  const lh = px * 1.18;
  const widths = lines.map((s) => ctx.measureText(s).width);
  const blockW = Math.max(...widths, 1), blockH = lh * lines.length;
  const cx = Math.min(Math.max(l.x * W, blockW / 2 + W * 0.02), W - blockW / 2 - W * 0.02);
  const cy = Math.min(Math.max(l.y * H, blockH / 2 + H * 0.02), H - blockH / 2 - H * 0.02);
  const top = cy - blockH / 2;

  lines.forEach((s, i) => {
    const y = top + lh * (i + 0.5);
    if (l.bg === "box") {
      const pad = px * 0.28;
      ctx.fillStyle = l.bgColor;
      roundRect(ctx, cx - widths[i] / 2 - pad, y - lh / 2 - pad * 0.15, widths[i] + pad * 2, lh + pad * 0.3, px * 0.18);
      ctx.fill();
    }
    if (l.bg === "outline") {
      ctx.lineJoin = "round";
      ctx.lineWidth = px * 0.16;
      ctx.strokeStyle = l.bgColor;
      ctx.strokeText(s, cx, y);
    }
    if (l.bg === "shadow") { ctx.shadowColor = "rgba(0,0,0,0.65)"; ctx.shadowBlur = px * 0.35; ctx.shadowOffsetY = px * 0.06; }
    ctx.fillStyle = l.color;
    ctx.fillText(s, cx, y);
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  });
  return { id: l.id, x0: cx - blockW / 2, y0: top, x1: cx + blockW / 2, y1: top + blockH };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Foto final em JPEG (lado menor 1080 px). */
export async function exportImage(m: Media, spec: EditSpec): Promise<Blob> {
  const bmp = await createImageBitmap(m.blob, { imageOrientation: "from-image" });
  const { w, h } = outputSize(spec, bmp.width, bmp.height, 1080);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
  drawFrame(ctx, bmp, bmp.width, bmp.height, spec, w, h, null);
  bmp.close();
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("falha ao gerar a imagem"))), "image/jpeg", 0.92));
}
