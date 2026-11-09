"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Captions, Copy, Crop, Download, Loader2, Pause, Play, Plus, Send, Sliders, Sparkles, Trash2, Type, Undo2, Palette, Check } from "lucide-react";
import { db } from "@/lib/db";
import { FONT_LABEL, loadFonts } from "@/lib/fonts";
import { download, extOf, fmtTime, mediaFromBlob } from "@/lib/media";
import { ASPECTS, defaultSpec, drawFrame, exportImage, outDuration, outputSize, srcToOut, trimEnd } from "@/lib/render";
import { applyAiEdit, applyStyle, type AiResult } from "@/lib/ai/edit-schema";
import { OBJECTIVES } from "@/lib/marketing";
import { BUILTIN_STYLES } from "@/lib/styles";
import { splitSegments, transcriptText } from "@/lib/subtitles";
import type { EditSpec, FontId, Media, Network, ObjectiveId, PostFormat, TextBg, TextLayer } from "@/lib/types";
import { uid } from "@/lib/db";
import { Chips, Sheet, Slider, Swatches, usePref, useStore } from "./ui";
import type { Nav } from "./app";

type Tab = "ia" | "estilo" | "ajustes" | "texto" | "corte" | "legendas";
type Box = { id: string; x0: number; y0: number; x1: number; y1: number };

const QUICK = {
  image: ["Deixa com cara profissional para vender", "Coloca um título chamativo", "Estilo mais quente e aconchegante", "Só escreve a legenda"],
  video: ["Corta para 15 s com gancho forte e legendas", "Transforma em reels de venda", "Deixa no estilo do creator energético", "Só escreve a legenda"],
};

export const FORMATS: Record<Network, { id: PostFormat; label: string }[]> = {
  instagram: [{ id: "feed", label: "Feed" }, { id: "carrossel", label: "Carrossel" }, { id: "reels", label: "Reels" }, { id: "story", label: "Story" }],
  tiktok: [{ id: "tiktok", label: "Vídeo TikTok" }],
};

export function Editor({ mediaId, go, back }: { mediaId: string; go: Nav; back: () => void }) {
  const [media, setMedia] = useState<Media | null>(null);
  const [spec, setSpecRaw] = useState<EditSpec | null>(null);
  const [undo, setUndo] = useState<EditSpec[]>([]);
  const [tab, setTab] = useState<Tab>("ia");
  const [selText, setSelText] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0); // segundo no vídeo final
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<Media | null>(null);
  const [askQuality, setAskQuality] = useState(false);

  const [objectiveId, setObjective] = usePref<ObjectiveId>("objective", "venda");
  const [network, setNetwork] = usePref<Network>("network", "instagram");
  const [styleId, setStyleId] = usePref<string>("style", "");
  const [brand] = usePref<string>("brand", "");
  const customStyles = useStore("styles");
  const styles = useMemo(() => [...BUILTIN_STYLES, ...(customStyles ?? [])], [customStyles]);
  const style = styles.find((s) => s.id === styleId) ?? null;
  const [prompt, setPrompt] = useState("");
  const [ai, setAi] = useState<(AiResult & { provider?: string; model?: string }) | null>(null);

  const canvas = useRef<HTMLCanvasElement>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const image = useRef<ImageBitmap | null>(null);
  const boxes = useRef<Box[]>([]);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const specRef = useRef(spec);
  useLayoutEffect(() => { specRef.current = spec; });

  const setSpec = (f: (s: EditSpec) => EditSpec) => setSpecRaw((s) => (s ? f(s) : s));
  const commit = (next: EditSpec) => { if (spec) setUndo((u) => [...u.slice(-19), spec]); setSpecRaw(next); };

  // ---------- carregar mídia ----------
  useEffect(() => {
    let url = "";
    (async () => {
      const m = await db.get("media", mediaId);
      if (!m) { setError("Mídia não encontrada."); return; }
      await loadFonts();
      if (m.kind === "image") image.current = await createImageBitmap(m.blob, { imageOrientation: "from-image" });
      else {
        const v = document.createElement("video");
        v.playsInline = true; v.preload = "auto";
        url = URL.createObjectURL(m.blob);
        v.src = url;
        await new Promise((r) => (v.onloadeddata = r));
        video.current = v;
      }
      setMedia(m);
      setSpecRaw(m.spec ? structuredClone(m.spec) : defaultSpec(m));
    })().catch((e) => setError(e instanceof Error ? e.message : "Falha ao abrir a mídia."));
    return () => { video.current?.pause(); if (url) URL.revokeObjectURL(url); image.current?.close(); };
  }, [mediaId]);

  // ---------- prévia ----------
  const size = useMemo(() => (media && spec ? outputSize(spec, media.w, media.h, 540) : null), [media, spec?.aspect]); // eslint-disable-line react-hooks/exhaustive-deps

  const draw = useCallback(() => {
    const c = canvas.current, s = specRef.current;
    if (!c || !s || !media) return;
    const ctx = c.getContext("2d")!;
    const v = video.current;
    const t = v ? srcToOut(s, v.currentTime) : null;
    boxes.current = drawFrame(ctx, v ?? image.current, media.w, media.h, s, c.width, c.height, t, media.duration);
    if (selText && tab === "texto") {
      const b = boxes.current.find((x) => x.id === selText);
      if (b) { ctx.strokeStyle = "#ec4899"; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.strokeRect(b.x0 - 6, b.y0 - 4, b.x1 - b.x0 + 12, b.y1 - b.y0 + 8); ctx.setLineDash([]); }
    }
  }, [media, selText, tab]);

  useEffect(() => { draw(); }, [draw, spec, size]);

  // vídeo: toca dentro do trecho cortado, na velocidade escolhida
  useEffect(() => {
    const v = video.current;
    if (!v || !spec || !media) return;
    v.playbackRate = spec.speed;
    v.muted = spec.mute;
    if (v.currentTime < spec.trim.start || v.currentTime > trimEnd(spec, media.duration)) v.currentTime = spec.trim.start;
  }, [spec?.speed, spec?.mute, spec?.trim.start, spec?.trim.end, media]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const v = video.current;
    if (!v || !media) return;
    let raf = 0;
    const tick = () => {
      const s = specRef.current!;
      if (v.currentTime >= trimEnd(s, media.duration) - 0.03) { v.currentTime = s.trim.start; }
      setTime(srcToOut(s, v.currentTime));
      draw();
      raf = requestAnimationFrame(tick);
    };
    if (playing) { v.play().catch(() => setPlaying(false)); raf = requestAnimationFrame(tick); }
    else v.pause();
    const onSeeked = () => { setTime(srcToOut(specRef.current!, v.currentTime)); draw(); };
    v.addEventListener("seeked", onSeeked);
    return () => { cancelAnimationFrame(raf); v.removeEventListener("seeked", onSeeked); };
  }, [playing, media, draw]);

  // atalhos no PC (ignorados enquanto digita num campo)
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    const on = (e: KeyboardEvent) => keys.current(e);
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);

  const seek = (t: number) => { const v = video.current, s = specRef.current; if (v && s) v.currentTime = s.trim.start + t * s.speed; };

  // ---------- arrastar textos ----------
  const toCanvas = (e: React.PointerEvent) => {
    const c = canvas.current!, r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };
  const onDown = (e: React.PointerEvent) => {
    const p = toCanvas(e);
    const b = [...boxes.current].reverse().find((b) => p.x >= b.x0 - 12 && p.x <= b.x1 + 12 && p.y >= b.y0 - 12 && p.y <= b.y1 + 12);
    if (!b || !spec) return;
    const l = spec.texts.find((t) => t.id === b.id)!;
    const c = canvas.current!;
    drag.current = { id: b.id, dx: l.x * c.width - p.x, dy: l.y * c.height - p.y };
    setSelText(b.id); setTab("texto");
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const p = toCanvas(e), c = canvas.current!;
    const x = Math.min(0.98, Math.max(0.02, (p.x + d.dx) / c.width)), y = Math.min(0.98, Math.max(0.02, (p.y + d.dy) / c.height));
    setSpec((s) => ({ ...s, texts: s.texts.map((t) => (t.id === d.id ? { ...t, x, y } : t)) }));
  };

  // ---------- IA ----------
  const runAi = async (text: string, mode: "edit" | "caption" = "edit") => {
    if (!media || !spec) return;
    setStatus("a IA está pensando…"); setError("");
    try {
      const res = await fetch("/api/edit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text, mode: /só (escreve|a) legenda/i.test(text) ? "caption" : mode,
          media: { kind: media.kind, w: media.w, h: media.h, duration: media.duration },
          spec, transcript: spec.subtitles.segments.length ? transcriptText(spec.subtitles.segments) : null,
          style, objective: objectiveId, network, format: defaultFormat(network, media), brand,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Falha na IA.");
      setAi(j);
      if (j.edit) {
        const next = applyAiEdit(spec, j.edit, media, style);
        commit(next);
        if (next.subtitles.enabled && !next.subtitles.segments.length && media.kind === "video") void transcribe(next);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Falha na IA."); }
    finally { setStatus((s) => (s.startsWith("a IA") ? "" : s)); }
  };

  // ---------- legendas ----------
  const transcribe = async (base?: EditSpec) => {
    if (!media) return;
    setError("");
    try {
      const { extractAudio } = await import("@/lib/video");
      const audio = await extractAudio(media, setStatus);
      setStatus("transcrevendo as falas…");
      const fd = new FormData();
      fd.append("audio", audio, "audio.mp3");
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Falha ao transcrever.");
      const segments = splitSegments(j.segments ?? []);
      if (!segments.length) throw new Error("Não encontrei falas neste vídeo.");
      setSpecRaw((s) => { const cur = base ?? s!; return { ...cur, subtitles: { ...cur.subtitles, enabled: true, segments } }; });
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao transcrever."); }
    finally { setStatus(""); }
  };

  // ---------- salvar ----------
  const save = async (quality: 720 | 1080 = 720) => {
    if (!media || !spec) return;
    setPlaying(false); setAskQuality(false); setError("");
    try {
      let blob: Blob;
      if (media.kind === "image") { setStatus("gerando a foto…"); blob = await exportImage(media, spec); }
      else { const { exportVideo } = await import("@/lib/video"); blob = await exportVideo(media, spec, quality, setStatus); }
      const out = await db.put("media", await mediaFromBlob(blob, `${media.name.replace(/\.\w+$/, "")}-editada.${media.kind === "image" ? "jpg" : "mp4"}`, { parentId: media.id }));
      await db.put("media", { ...media, spec });
      setSaved(out);
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao salvar."); }
    finally { setStatus(""); }
  };

  useEffect(() => { keys.current = (e: KeyboardEvent) => {
    const el = e.target as HTMLElement;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); if (!status && media) { if (media.kind === "video") setAskQuality(true); else void save(); } return; }
    if (typing) return;
    if (mod && e.key.toLowerCase() === "z" && undo.length) { e.preventDefault(); setSpecRaw(undo[undo.length - 1]); setUndo((u) => u.slice(0, -1)); }
    else if (e.key === " " && media?.kind === "video") { e.preventDefault(); setPlaying((p) => !p); }
    else if ((e.key === "Delete" || e.key === "Backspace") && selText && spec) { e.preventDefault(); commit({ ...spec, texts: spec.texts.filter((t) => t.id !== selText) }); setSelText(null); }
  }; });

  if (error && !media) return <div className="p-6 text-center"><p className="mb-4 text-bad">{error}</p><button className="btn" onClick={back}>Voltar</button></div>;
  if (!media || !spec || !size) return <div className="flex h-full items-center justify-center text-muted"><Loader2 className="animate-spin" /></div>;

  const isVideo = media.kind === "video";
  const dur = outDuration(spec, media.duration);
  const sel = spec.texts.find((t) => t.id === selText) ?? null;
  const updText = (id: string, p: Partial<TextLayer>) => setSpec((s) => ({ ...s, texts: s.texts.map((t) => (t.id === id ? { ...t, ...p } : t)) }));
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "ia", label: "IA", icon: <Sparkles size={16} /> }, { id: "estilo", label: "Estilo", icon: <Palette size={16} /> },
    { id: "ajustes", label: "Ajustes", icon: <Sliders size={16} /> }, { id: "texto", label: "Texto", icon: <Type size={16} /> },
    { id: "corte", label: "Corte", icon: <Crop size={16} /> }, ...(isVideo ? [{ id: "legendas" as Tab, label: "Legendas", icon: <Captions size={16} /> }] : []),
  ];

  return (
    <div className="flex h-full flex-col">
      <header className="safe-t flex items-center gap-2 border-b border-line px-3 py-2">
        <button onClick={back} aria-label="Voltar"><ArrowLeft size={22} /></button>
        <span className="font-semibold">Editar {isVideo ? "vídeo" : "foto"}</span>
        <button className="btn ml-auto" disabled={!undo.length} onClick={() => { setSpecRaw(undo[undo.length - 1]); setUndo((u) => u.slice(0, -1)); }} aria-label="Desfazer"><Undo2 size={16} /></button>
        <button className="btn btn-primary" disabled={!!status} onClick={() => (isVideo ? setAskQuality(true) : save())}><Check size={16} /> Salvar</button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      {/* prévia */}
      <div className="flex shrink-0 flex-col items-center bg-black py-2 md:min-w-0 md:flex-1 md:justify-center md:py-6">
        <canvas ref={canvas} width={size.w} height={size.h} className="max-h-[46vh] max-w-full touch-none md:max-h-[calc(100vh-150px)] md:cursor-move" style={{ aspectRatio: `${size.w}/${size.h}` }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={() => (drag.current = null)} onPointerCancel={() => (drag.current = null)} />
        {isVideo && (
          <div className="mt-2 flex w-full max-w-xl items-center gap-2 px-3">
            <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pausar" : "Tocar"}>{playing ? <Pause size={20} /> : <Play size={20} />}</button>
            <input type="range" className="flex-1 accent-[var(--accent)]" min={0} max={Math.max(dur, 0.1)} step={0.05} value={Math.min(time, dur)} onChange={(e) => seek(+e.target.value)} />
            <span className="text-xs tabular-nums text-muted">{fmtTime(time)} / {fmtTime(dur)}</span>
          </div>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col md:w-[420px] md:flex-none md:border-l md:border-line md:bg-panel">
      {(status || error) && <p className={`flex items-center gap-2 px-3 py-1.5 text-xs ${error ? "text-bad" : "text-muted"}`}>{status && <Loader2 size={12} className="animate-spin" />}{error || status}</p>}

      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-line px-2 py-1.5">
        {tabs.map((t) => <button key={t.id} className={`chip ${tab === t.id ? "chip-on" : ""}`} onClick={() => setTab(t.id)}>{t.icon}{t.label}</button>)}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-8">
        {tab === "ia" && (
          <div className="space-y-3">
            <div>
              <span className="lbl">Objetivo do post</span>
              <select className="inp" value={objectiveId} onChange={(e) => setObjective(e.target.value as ObjectiveId)}>
                {OBJECTIVES.map((o) => <option key={o.id} value={o.id}>{o.emoji} {o.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="lbl mb-0">Rede</span>
              <Chips<Network> value={network} onChange={setNetwork} options={[{ id: "instagram", label: "Instagram" }, { id: "tiktok", label: "TikTok" }]} />
              {style && <span className="ml-auto truncate text-xs text-muted">estilo: {style.name}</span>}
            </div>
            <textarea className="inp" rows={3} placeholder={isVideo ? "Ex.: corta só a melhor parte, coloca um gancho de venda e legendas" : "Ex.: deixa com cara de catálogo e coloca o preço em destaque"} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
            <div className="flex flex-wrap gap-1.5">
              {QUICK[media.kind].map((q) => <button key={q} className="chip" onClick={() => setPrompt(q)}>{q}</button>)}
            </div>
            <button className="btn btn-primary w-full" disabled={!!status} onClick={() => runAi(prompt)}><Sparkles size={16} /> Editar com IA</button>
            {isVideo && !spec.subtitles.segments.length && <p className="text-xs text-muted">Dica: transcreva as falas na aba Legendas para a IA escolher os melhores cortes pelo que é dito.</p>}
            {ai && <AiCard ai={ai} onHook={(h) => commit({ ...spec, texts: [...spec.texts, newText(h, spec, style?.text, 0.17)] })} setCaption={(caption) => setAi({ ...ai, caption })} />}
          </div>
        )}

        {tab === "estilo" && (
          <div className="grid grid-cols-2 gap-2">
            {styles.map((st) => (
              <button key={st.id} onClick={() => { setStyleId(st.id); commit(applyStyle(spec, st, media)); }}
                className={`card p-2.5 text-left ${st.id === styleId ? "border-accent" : ""}`}>
                <div className="flex items-center gap-1 text-sm font-semibold">{st.name}{st.custom && <span className="text-[10px] text-accent">meu</span>}</div>
                <p className="mt-1 line-clamp-3 text-[11px] text-muted">{st.description}</p>
              </button>
            ))}
            <p className="col-span-2 text-xs text-muted">O estilo muda cores, formato e fonte agora, e orienta a IA no tom da legenda e na edição. Crie os seus na aba Estilos.</p>
          </div>
        )}

        {tab === "ajustes" && (
          <div className="space-y-3">
            <Slider label="Brilho" value={spec.adjust.brightness} min={0.6} max={1.5} onChange={(v) => setSpec((s) => ({ ...s, adjust: { ...s.adjust, brightness: v } }))} />
            <Slider label="Contraste" value={spec.adjust.contrast} min={0.6} max={1.6} onChange={(v) => setSpec((s) => ({ ...s, adjust: { ...s.adjust, contrast: v } }))} />
            <Slider label="Saturação" value={spec.adjust.saturation} min={0} max={2} onChange={(v) => setSpec((s) => ({ ...s, adjust: { ...s.adjust, saturation: v } }))} />
            <Slider label="Temperatura (frio ↔ quente)" value={spec.adjust.warmth} min={-1} max={1} onChange={(v) => setSpec((s) => ({ ...s, adjust: { ...s.adjust, warmth: v } }))} />
            <Slider label="Vinheta" value={spec.adjust.vignette} min={0} max={1} onChange={(v) => setSpec((s) => ({ ...s, adjust: { ...s.adjust, vignette: v } }))} />
            <button className="btn" onClick={() => commit({ ...spec, adjust: defaultSpec(media).adjust })}>Voltar ao original</button>
          </div>
        )}

        {tab === "texto" && (
          <div className="space-y-3">
            <button className="btn w-full" onClick={() => { const t = newText("Seu texto aqui", spec, style?.text, 0.5); commit({ ...spec, texts: [...spec.texts, t] }); setSelText(t.id); }}><Plus size={16} /> Adicionar texto</button>
            {spec.texts.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {spec.texts.map((t) => <button key={t.id} className={`chip max-w-40 truncate ${t.id === selText ? "chip-on" : ""}`} onClick={() => setSelText(t.id)}>{t.text || "(vazio)"}</button>)}
              </div>
            )}
            {sel ? <TextControls l={sel} isVideo={isVideo} dur={dur} time={time} upd={(p) => updText(sel.id, p)} del={() => { commit({ ...spec, texts: spec.texts.filter((t) => t.id !== sel.id) }); setSelText(null); }} />
              : <p className="text-xs text-muted">Toque num texto na prévia para editar; arraste para mudar de lugar.</p>}
          </div>
        )}

        {tab === "corte" && (
          <div className="space-y-3">
            <div><span className="lbl">Formato</span><Chips value={spec.aspect} onChange={(a) => commit({ ...spec, aspect: a })} options={ASPECTS.map((a) => ({ id: a.id, label: a.label }))} /></div>
            <Slider label="Zoom" value={spec.zoom} min={1} max={3} onChange={(v) => setSpec((s) => ({ ...s, zoom: v }))} fmt={(v) => `${v.toFixed(1)}×`} />
            <Slider label="Enquadrar (esquerda ↔ direita)" value={spec.focusX} min={0} max={1} onChange={(v) => setSpec((s) => ({ ...s, focusX: v }))} fmt={(v) => `${Math.round(v * 100)}%`} />
            <Slider label="Enquadrar (cima ↔ baixo)" value={spec.focusY} min={0} max={1} onChange={(v) => setSpec((s) => ({ ...s, focusY: v }))} fmt={(v) => `${Math.round(v * 100)}%`} />
            {isVideo && (
              <>
                <Slider label="Início" value={spec.trim.start} min={0} max={Math.max(0, media.duration - 0.5)} step={0.1} fmt={fmtTime}
                  onChange={(v) => setSpec((s) => ({ ...s, trim: { ...s.trim, start: Math.min(v, trimEnd(s, media.duration) - 0.5) } }))} />
                <Slider label="Fim" value={trimEnd(spec, media.duration)} min={0.5} max={media.duration} step={0.1} fmt={fmtTime}
                  onChange={(v) => setSpec((s) => ({ ...s, trim: { ...s.trim, end: v >= media.duration - 0.05 ? null : Math.max(v, s.trim.start + 0.5) } }))} />
                <div><span className="lbl">Velocidade</span><Chips value={spec.speed} onChange={(v) => commit({ ...spec, speed: v })} options={[0.5, 0.75, 1, 1.1, 1.25, 1.5, 2].map((v) => ({ id: v, label: `${v}×` }))} /></div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={spec.mute} onChange={(e) => commit({ ...spec, mute: e.target.checked })} /> Tirar o som (para colocar música no app da rede)</label>
                <p className="text-xs text-muted">Duração final: {fmtTime(dur)}</p>
              </>
            )}
          </div>
        )}

        {tab === "legendas" && isVideo && (
          <div className="space-y-3">
            <button className="btn btn-primary w-full" disabled={!!status} onClick={() => transcribe()}><Captions size={16} /> {spec.subtitles.segments.length ? "Transcrever de novo" : "Transcrever as falas"}</button>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={spec.subtitles.enabled} onChange={(e) => setSpec((s) => ({ ...s, subtitles: { ...s.subtitles, enabled: e.target.checked } }))} /> Mostrar legendas no vídeo</label>
            {spec.subtitles.segments.length > 0 && (
              <>
                <SubStyle spec={spec} setSpec={setSpec} />
                <span className="lbl">Falas (toque para corrigir)</span>
                <div className="space-y-1.5">
                  {spec.subtitles.segments.map((sg, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <button className="w-12 shrink-0 text-left text-[11px] tabular-nums text-muted" onClick={() => seek(Math.max(0, srcToOut(spec, sg.start)))}>{fmtTime(sg.start)}</button>
                      <input className="inp h-8" value={sg.text} onChange={(e) => setSpec((s) => ({ ...s, subtitles: { ...s.subtitles, segments: s.subtitles.segments.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) } }))} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      </div>
      </div>

      {askQuality && (
        <Sheet title="Qualidade do vídeo" onClose={() => setAskQuality(false)}>
          <p className="mb-3 text-sm text-muted">O vídeo é gerado no seu aparelho, sem enviar para servidor. Vídeos longos podem demorar alguns minutos.</p>
          <div className="grid gap-2">
            <button className="btn btn-primary" onClick={() => save(720)}>Rápido · 720p (bom para reels e TikTok)</button>
            <button className="btn" onClick={() => save(1080)}>Alta · 1080p (mais lento)</button>
          </div>
        </Sheet>
      )}
      {saved && (
        <Sheet title="Salvo na sua biblioteca" onClose={() => setSaved(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={saved.thumb} alt="" className="mx-auto mb-3 max-h-48 rounded-lg" />
          <div className="grid gap-2">
            <button className="btn btn-primary" onClick={() => go({ name: "post", draft: { mediaIds: [saved.id], caption: ai?.caption, hashtags: ai?.hashtags, objective: objectiveId, network, format: defaultFormat(network, saved) } })}><Send size={16} /> Criar post com esta mídia</button>
            <button className="btn" onClick={() => download(saved.blob, `postai-${saved.id}.${extOf(saved)}`)}><Download size={16} /> Baixar</button>
            <button className="btn" onClick={() => setSaved(null)}>Continuar editando</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

export function defaultFormat(n: Network, m: Pick<Media, "kind">): PostFormat {
  return n === "tiktok" ? "tiktok" : m.kind === "video" ? "reels" : "feed";
}

function newText(text: string, spec: EditSpec, st: Partial<TextLayer> | undefined, y: number): TextLayer {
  return { id: uid(), text, x: 0.5, y: spec.aspect === "9:16" && y < 0.2 ? 0.17 : y, size: 0.07, color: "#ffffff", bg: "shadow", bgColor: "#000000", font: "sans", bold: true, upper: false, start: null, end: null, ...st };
}

function AiCard({ ai, onHook, setCaption }: { ai: AiResult & { provider?: string; model?: string }; onHook: (h: string) => void; setCaption: (c: string) => void }) {
  const [copied, setCopied] = useState(false);
  const full = `${ai.caption}${ai.hashtags.length ? `\n\n${ai.hashtags.map((h) => `#${h}`).join(" ")}` : ""}`;
  return (
    <div className="card space-y-2 p-3">
      {ai.explanation && <p className="text-sm">{ai.explanation}</p>}
      {ai.caption && (
        <>
          <span className="lbl">Legenda</span>
          <textarea className="inp text-sm" rows={6} value={ai.caption} onChange={(e) => setCaption(e.target.value)} />
          {ai.hashtags.length > 0 && <p className="text-xs text-accent">{ai.hashtags.map((h) => `#${h}`).join(" ")}</p>}
          <button className="btn w-full" onClick={() => navigator.clipboard.writeText(full).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}><Copy size={14} /> {copied ? "copiada!" : "Copiar legenda + hashtags"}</button>
        </>
      )}
      {ai.hooks.length > 0 && (
        <>
          <span className="lbl">Ganchos alternativos (toque para pôr na mídia)</span>
          <div className="flex flex-wrap gap-1.5">{ai.hooks.map((h) => <button key={h} className="chip h-auto py-1 text-left" onClick={() => onHook(h)}>{h}</button>)}</div>
        </>
      )}
      {ai.provider && <p className="text-[10px] text-muted">{ai.provider} · {ai.model}</p>}
    </div>
  );
}

function TextControls({ l, isVideo, dur, time, upd, del }: { l: TextLayer; isVideo: boolean; dur: number; time: number; upd: (p: Partial<TextLayer>) => void; del: () => void }) {
  return (
    <div className="space-y-3">
      <textarea className="inp" rows={2} value={l.text} onChange={(e) => upd({ text: e.target.value })} />
      <Chips<FontId> value={l.font} onChange={(font) => upd({ font })} options={(Object.keys(FONT_LABEL) as FontId[]).map((f) => ({ id: f, label: FONT_LABEL[f] }))} />
      <Slider label="Tamanho" value={l.size} min={0.03} max={0.16} step={0.005} onChange={(size) => upd({ size })} fmt={(v) => `${Math.round(v * 1000) / 10}`} />
      <div><span className="lbl">Cor do texto</span><Swatches value={l.color} onChange={(color) => upd({ color })} /></div>
      <div><span className="lbl">Fundo</span><Chips<TextBg> value={l.bg} onChange={(bg) => upd({ bg })} options={[{ id: "none", label: "Nenhum" }, { id: "shadow", label: "Sombra" }, { id: "outline", label: "Contorno" }, { id: "box", label: "Caixa" }]} /></div>
      {(l.bg === "box" || l.bg === "outline") && <div><span className="lbl">Cor do fundo</span><Swatches value={l.bgColor} onChange={(bgColor) => upd({ bgColor })} /></div>}
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={l.bold} onChange={(e) => upd({ bold: e.target.checked })} /> Negrito</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={l.upper} onChange={(e) => upd({ upper: e.target.checked })} /> MAIÚSCULAS</label>
      </div>
      {isVideo && (
        <div className="space-y-2">
          <span className="lbl">Quando aparece (vazio = o vídeo todo)</span>
          <div className="flex items-center gap-2 text-sm">
            <input className="inp w-20" type="number" step={0.1} min={0} max={dur} placeholder="início" value={l.start ?? ""} onChange={(e) => upd({ start: e.target.value === "" ? null : +e.target.value })} />
            <span>até</span>
            <input className="inp w-20" type="number" step={0.1} min={0} max={dur} placeholder="fim" value={l.end ?? ""} onChange={(e) => upd({ end: e.target.value === "" ? null : +e.target.value })} />
            <button className="chip" onClick={() => upd({ start: +time.toFixed(1) })}>início = agora</button>
          </div>
        </div>
      )}
      <button className="btn text-bad" onClick={del}><Trash2 size={14} /> Remover texto</button>
    </div>
  );
}

function SubStyle({ spec, setSpec }: { spec: EditSpec; setSpec: (f: (s: EditSpec) => EditSpec) => void }) {
  const st = spec.subtitles.style;
  const upd = (p: Partial<typeof st>) => setSpec((s) => ({ ...s, subtitles: { ...s.subtitles, style: { ...s.subtitles.style, ...p } } }));
  return (
    <div className="card space-y-3 p-3">
      <Chips<FontId> value={st.font} onChange={(font) => upd({ font })} options={(Object.keys(FONT_LABEL) as FontId[]).map((f) => ({ id: f, label: FONT_LABEL[f] }))} />
      <Swatches value={st.color} onChange={(color) => upd({ color })} />
      <Chips<TextBg> value={st.bg} onChange={(bg) => upd({ bg })} options={[{ id: "outline", label: "Contorno" }, { id: "box", label: "Caixa" }, { id: "shadow", label: "Sombra" }]} />
      <Slider label="Altura na tela" value={st.y} min={0.1} max={0.9} onChange={(y) => upd({ y })} fmt={(v) => `${Math.round(v * 100)}%`} />
      <Slider label="Tamanho" value={st.size} min={0.035} max={0.1} step={0.005} onChange={(size) => upd({ size })} fmt={(v) => `${Math.round(v * 1000) / 10}`} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={st.upper} onChange={(e) => upd({ upper: e.target.checked })} /> MAIÚSCULAS</label>
    </div>
  );
}
