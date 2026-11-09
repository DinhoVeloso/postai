// Edição de vídeo no próprio aparelho com ffmpeg (WebAssembly): sem servidor e sem custo.
// Recorte, cor e velocidade viram filtros do ffmpeg; textos, legendas e vinheta são desenhados
// no canvas (mesmo desenho da prévia) e sobrepostos como imagens PNG transparentes.
import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { cropRect, drawFrame, drawText, outDuration, outputSize, subtitleLayer, subtitleWindows, trimEnd, warmthMul } from "./render";
import type { EditSpec, Media } from "./types";
import { loadFonts } from "./fonts";

const CORE = "https://unpkg.com/@ffmpeg/core@0.12.9/dist/esm";
let loading: Promise<FFmpeg> | null = null;

export function getFFmpeg(onStatus?: (s: string) => void) {
  if (!loading) {
    loading = (async () => {
      onStatus?.("carregando o editor de vídeo (~30 MB, só na primeira vez)");
      // @ffmpeg/ffmpeg é servido de /public/ffmpeg (cópia de node_modules/@ffmpeg/ffmpeg/dist/esm):
      // o Turbopack não empacota o Worker que ele cria, e o Worker precisa ser do mesmo domínio.
      const lib = "/ffmpeg/index.js";
      const [{ FFmpeg: FF }, { toBlobURL }] = await Promise.all([import(/* turbopackIgnore: true */ /* webpackIgnore: true */ lib) as Promise<{ FFmpeg: new () => FFmpeg }>, import("@ffmpeg/util")]);
      const ff = new FF();
      await ff.load({
        coreURL: await toBlobURL(`${CORE}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${CORE}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ff;
    })().catch((e) => { loading = null; throw e; });
  }
  return loading;
}

const n = (x: number) => +x.toFixed(4);

function png(W: number, H: number, draw: (ctx: CanvasRenderingContext2D) => void): Promise<Uint8Array> {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  draw(c.getContext("2d")!);
  return new Promise((res, rej) => c.toBlob(async (b) => (b ? res(new Uint8Array(await b.arrayBuffer())) : rej(new Error("png"))), "image/png"));
}

export type Quality = 720 | 1080;

export async function exportVideo(m: Media, spec: EditSpec, quality: Quality, onStatus: (s: string) => void): Promise<Blob> {
  await loadFonts();
  const ff = await getFFmpeg(onStatus);
  const { w: W, h: H } = outputSize(spec, m.w, m.h, quality);
  const c = cropRect(spec, m.w, m.h, W, H);
  const dur = outDuration(spec, m.duration);
  const inName = `in.${m.blob.type.includes("webm") ? "webm" : m.blob.type.includes("quicktime") ? "mov" : "mp4"}`;
  await ff.writeFile(inName, new Uint8Array(await m.blob.arrayBuffer()));

  // camadas: uma fixa (vinheta + textos sem tempo) e uma por texto com tempo / trecho de legenda
  const layers: { file: string; start: number | null; end: number | null }[] = [];
  const fixed = spec.texts.filter((l) => l.start == null && l.end == null);
  if (fixed.length || spec.adjust.vignette > 0) {
    await ff.writeFile("l0.png", await png(W, H, (ctx) => drawFrame(ctx, null, 0, 0, spec, W, H, null, 0, { only: (l) => fixed.includes(l), subtitles: false })));
    layers.push({ file: "l0.png", start: null, end: null });
  }
  const timed = [
    ...spec.texts.filter((l) => !fixed.includes(l)).map((l) => ({ start: l.start ?? 0, end: l.end ?? dur, draw: (ctx: CanvasRenderingContext2D) => drawText(ctx, l, W, H) })),
    ...subtitleWindows(spec, m.duration).map((s) => ({ start: s.start, end: s.end, draw: (ctx: CanvasRenderingContext2D) => drawText(ctx, subtitleLayer(spec.subtitles.style, s.text), W, H) })),
  ];
  for (const [i, tl] of timed.entries()) {
    const file = `l${i + 1}.png`;
    await ff.writeFile(file, await png(W, H, tl.draw));
    layers.push({ file, start: tl.start, end: tl.end });
  }

  const a = spec.adjust, wm = warmthMul(a.warmth);
  const chain = [
    `crop=${Math.floor(c.w / 2) * 2}:${Math.floor(c.h / 2) * 2}:${Math.round(c.x)}:${Math.round(c.y)}`,
    `scale=${W}:${H}:flags=bicubic`, "setsar=1",
    a.brightness !== 1 ? `colorchannelmixer=rr=${n(a.brightness)}:gg=${n(a.brightness)}:bb=${n(a.brightness)}` : "",
    a.contrast !== 1 || a.saturation !== 1 ? `eq=contrast=${n(a.contrast)}:saturation=${n(a.saturation)}` : "",
    a.warmth ? `colorchannelmixer=rr=${n(wm.r)}:gg=${n(wm.g)}:bb=${n(wm.b)}` : "",
    spec.speed !== 1 ? `setpts=PTS/${n(spec.speed)}` : "",
    "fps=30",
  ].filter(Boolean).join(",");
  let graph = `[0:v]${chain}[v0]`;
  layers.forEach((l, i) => {
    const en = l.start == null ? "" : `:enable='between(t,${n(l.start)},${n(l.end!)})'`;
    graph += `;[v${i}][${i + 1}:v]overlay=0:0${en}[v${i + 1}]`;
  });

  const args = ["-ss", String(n(spec.trim.start)), "-t", String(n(trimEnd(spec, m.duration) - spec.trim.start)), "-i", inName];
  for (const l of layers) args.push("-i", l.file);
  args.push("-filter_complex", graph, "-map", `[v${layers.length}]`);
  if (spec.mute) args.push("-an");
  else {
    args.push("-map", "0:a?", "-c:a", "aac", "-b:a", "128k");
    if (spec.speed !== 1) args.push("-af", `atempo=${n(spec.speed)}`);
  }
  args.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "out.mp4");

  const onProgress = ({ time }: { time: number }) => { if (dur > 0) onStatus(`gerando vídeo ${Math.min(99, Math.round((time / 1e6 / dur) * 100))}%`); };
  const logs: string[] = [];
  const onLog = ({ message }: { message: string }) => { logs.push(message); if (logs.length > 30) logs.shift(); };
  ff.on("progress", onProgress);
  ff.on("log", onLog);
  onStatus("gerando vídeo 0%");
  try {
    const code = await ff.exec(args);
    if (code !== 0) throw new Error(`O ffmpeg falhou (código ${code}): ${logs.slice(-3).join(" | ")}`);
    const data = (await ff.readFile("out.mp4")) as Uint8Array;
    return new Blob([data.slice().buffer], { type: "video/mp4" });
  } finally {
    ff.off("progress", onProgress);
    ff.off("log", onLog);
    for (const f of [inName, "out.mp4", ...layers.map((l) => l.file)]) await ff.deleteFile(f).catch(() => {});
  }
}

/** Áudio leve (mp3 mono 16 kHz) para transcrever as falas. */
export async function extractAudio(m: Media, onStatus: (s: string) => void): Promise<Blob> {
  const ff = await getFFmpeg(onStatus);
  onStatus("separando o áudio");
  const inName = "a_in";
  await ff.writeFile(inName, new Uint8Array(await m.blob.arrayBuffer()));
  try {
    const code = await ff.exec(["-i", inName, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "32k", "a.mp3"]);
    if (code !== 0) throw new Error("Este vídeo não tem áudio para transcrever.");
    const data = (await ff.readFile("a.mp3")) as Uint8Array;
    return new Blob([data.slice().buffer], { type: "audio/mpeg" });
  } finally {
    for (const f of [inName, "a.mp3"]) await ff.deleteFile(f).catch(() => {});
  }
}
