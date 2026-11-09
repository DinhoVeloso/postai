"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Circle, ImagePlus, RefreshCw, Square } from "lucide-react";
import { db } from "@/lib/db";
import { importFiles, mediaFromBlob, fmtTime } from "@/lib/media";
import type { Nav } from "./app";

type Mode = "foto" | "video";

function pickMime() {
  for (const t of ["video/mp4;codecs=avc1,mp4a", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"]) if (MediaRecorder.isTypeSupported?.(t)) return t;
  return "";
}

export function CameraView({ go, back }: { go: Nav; back: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const [mode, setMode] = useState<Mode>("foto");
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(0); // segundos gravando (0 = parado)
  const [saving, setSaving] = useState(false);
  const fallback = useRef<HTMLInputElement>(null);

  const start = useCallback(async () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    if (!navigator.mediaDevices?.getUserMedia) { setError("Este navegador não libera a câmera aqui (precisa de https). Use o botão abaixo para abrir a câmera do celular."); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: mode === "video" });
      stream.current = s;
      if (video.current) { video.current.srcObject = s; await video.current.play().catch(() => {}); }
      setError("");
    } catch (e) {
      setError(e instanceof DOMException && e.name === "NotAllowedError" ? "Permissão da câmera negada. Libere nas configurações do navegador." : "Não foi possível abrir a câmera.");
    }
  }, [facing, mode]);

  useEffect(() => { start(); return () => stream.current?.getTracks().forEach((t) => t.stop()); }, [start]);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setRecording((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (blob: Blob, name: string) => {
    setSaving(true);
    try { const m = await db.put("media", await mediaFromBlob(blob, name)); go({ name: "editor", mediaId: m.id }); }
    catch (e) { setError(e instanceof Error ? e.message : "Falha ao salvar."); setSaving(false); }
  };

  const photo = () => {
    const v = video.current;
    if (!v?.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext("2d")!;
    if (facing === "user") { ctx.translate(c.width, 0); ctx.scale(-1, 1); } // selfie sem espelho invertido
    ctx.drawImage(v, 0, 0);
    c.toBlob((b) => b && save(b, `foto-${Date.now()}.jpg`), "image/jpeg", 0.93);
  };

  const toggleRec = () => {
    if (rec.current) { rec.current.stop(); return; }
    if (!stream.current) return;
    const mime = pickMime();
    const r = new MediaRecorder(stream.current, mime ? { mimeType: mime, videoBitsPerSecond: 8_000_000 } : undefined);
    const chunks: Blob[] = [];
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    r.onstop = () => {
      rec.current = null; setRecording(0);
      const type = r.mimeType || mime || "video/webm";
      save(new Blob(chunks, { type: type.split(";")[0] }), `video-${Date.now()}.${type.includes("mp4") ? "mp4" : "webm"}`);
    };
    r.start(1000);
    rec.current = r;
    setRecording(1);
  };

  return (
    <div className="relative flex h-full flex-col bg-black">
      <video ref={video} playsInline muted className={`min-h-0 flex-1 object-contain ${facing === "user" ? "-scale-x-100" : ""}`} />
      <div className="safe-t absolute inset-x-0 top-0 flex items-center p-3">
        <button className="rounded-full bg-black/50 p-2" onClick={back} aria-label="Voltar"><ArrowLeft size={20} /></button>
        {recording > 0 && <span className="mx-auto rounded-full bg-bad px-3 py-1 text-sm font-semibold tabular-nums">● {fmtTime(recording - 1)}</span>}
      </div>
      {error && <p className="absolute inset-x-4 top-20 rounded-lg bg-black/80 p-3 text-center text-sm">{error}</p>}
      <div className="safe-b bg-black px-6 pt-3">
        <div className="mb-3 flex justify-center gap-2">
          {(["foto", "video"] as Mode[]).map((m) => <button key={m} disabled={recording > 0} className={`chip ${mode === m ? "chip-on" : ""}`} onClick={() => setMode(m)}>{m === "foto" ? "Foto" : "Vídeo"}</button>)}
        </div>
        <div className="flex items-center justify-between pb-2">
          <button className="rounded-full bg-panel-2 p-3" onClick={() => fallback.current?.click()} aria-label="Galeria ou câmera do celular"><ImagePlus size={22} /></button>
          <button disabled={saving || !!error} onClick={mode === "foto" ? photo : toggleRec} aria-label={mode === "foto" ? "Tirar foto" : "Gravar"}
            className={`flex h-18 w-18 items-center justify-center rounded-full border-4 border-white ${mode === "video" ? "bg-bad" : "bg-white/90"} disabled:opacity-40`}>
            {mode === "video" ? (recording ? <Square size={26} fill="white" /> : <Circle size={26} fill="white" />) : null}
          </button>
          <button className="rounded-full bg-panel-2 p-3" disabled={recording > 0} onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))} aria-label="Trocar câmera"><RefreshCw size={22} /></button>
        </div>
        {saving && <p className="pb-2 text-center text-xs text-muted">salvando…</p>}
      </div>
      <input ref={fallback} type="file" accept="image/*,video/*" hidden onChange={async (e) => {
        if (!e.target.files?.length) return;
        setSaving(true);
        try { const [m] = await importFiles(e.target.files); go({ name: "editor", mediaId: m.id }); } catch (err) { setError(err instanceof Error ? err.message : "Falha."); setSaving(false); }
      }} />
    </div>
  );
}
