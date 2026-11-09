// Entrada de mídias: lê tamanho/duração e gera a miniatura.
import { db, uid } from "./db";
import type { Media } from "./types";

function videoEl(blob: Blob): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.preload = "auto";
    v.onloadeddata = () => resolve(v);
    v.onerror = () => reject(new Error("Não foi possível ler este vídeo neste navegador."));
    v.src = URL.createObjectURL(blob);
  });
}

function thumbOf(src: CanvasImageSource, w: number, h: number) {
  const s = 320 / Math.max(w, h);
  const c = document.createElement("canvas");
  c.width = Math.round(w * s); c.height = Math.round(h * s);
  c.getContext("2d")!.drawImage(src, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.7);
}

export async function mediaFromBlob(blob: Blob, name: string, extra: Partial<Media> = {}): Promise<Media> {
  const base = { id: uid(), blob, created: Date.now(), name, ...extra };
  if (blob.type.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/i.test(name)) {
    const v = await videoEl(blob);
    // alguns navegadores só sabem a duração de gravações webm depois de pular para o fim
    if (!isFinite(v.duration)) { v.currentTime = 1e9; await new Promise((r) => (v.ontimeupdate = r)); v.currentTime = 0; }
    await new Promise<void>((r) => { v.onseeked = () => r(); v.currentTime = Math.min(0.1, v.duration / 2); });
    const m: Media = { ...base, kind: "video", w: v.videoWidth, h: v.videoHeight, duration: v.duration, thumb: thumbOf(v, v.videoWidth, v.videoHeight) };
    URL.revokeObjectURL(v.src);
    return m;
  }
  const bmp = await createImageBitmap(blob, { imageOrientation: "from-image" }).catch(() => { throw new Error(`Formato de imagem não suportado: ${name}`); });
  const m: Media = { ...base, kind: "image", w: bmp.width, h: bmp.height, duration: 0, thumb: thumbOf(bmp, bmp.width, bmp.height) };
  bmp.close();
  return m;
}

export async function importFiles(files: FileList | File[]) {
  const out: Media[] = [];
  for (const f of Array.from(files)) out.push(await db.put("media", await mediaFromBlob(f, f.name)));
  return out;
}

export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export const extOf = (m: Media) => (m.kind === "image" ? "jpg" : m.blob.type.includes("webm") ? "webm" : "mp4");
