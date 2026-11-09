"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BellRing, CheckCircle2, Copy, Download, Loader2, Plus, Share2, Sparkles, Trash2, X } from "lucide-react";
import { db, uid } from "@/lib/db";
import { download, extOf } from "@/lib/media";
import { OBJECTIVES } from "@/lib/marketing";
import { BUILTIN_STYLES } from "@/lib/styles";
import { defaultSpec } from "@/lib/render";
import { describeSlot, nextSlots, tipFor } from "@/lib/times";
import type { Media, Network, ObjectiveId, Post, PostFormat } from "@/lib/types";
import { Chips, Sheet, fmtDateTime, usePref, useStore } from "./ui";
import { FORMATS, defaultFormat } from "./editor";
import type { Nav } from "./app";

export type PostDraft = { mediaIds: string[]; caption?: string; hashtags?: string[]; objective?: ObjectiveId; network?: Network; format?: PostFormat };

const toLocalInput = (t: number) => { const d = new Date(t); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

export function PostEditor({ postId, draft, back, go }: { postId?: string; draft?: PostDraft; back: () => void; go: Nav }) {
  const media = useStore("media");
  const customStyles = useStore("styles");
  const [styleId] = usePref<string>("style", "");
  const [brand] = usePref<string>("brand", "");
  const [defObjective] = usePref<ObjectiveId>("objective", "venda");
  const [defNetwork] = usePref<Network>("network", "instagram");
  const [post, setPost] = useState<Post | null>(null);
  const [picker, setPicker] = useState(false);
  const [status, setStatus] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      if (postId) { const p = await db.get("posts", postId); if (p) { setPost(p); return; } }
      const network = draft?.network ?? defNetwork;
      setPost({
        id: uid(), mediaIds: draft?.mediaIds ?? [], network, format: draft?.format ?? (network === "tiktok" ? "tiktok" : "feed"),
        objective: draft?.objective ?? defObjective, caption: draft?.caption ?? "", hashtags: draft?.hashtags ?? [],
        scheduledAt: null, status: "rascunho", created: Date.now(),
      });
    })();
  }, [postId]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = useMemo(() => (post && media ? post.mediaIds.map((id) => media.find((m) => m.id === id)).filter((m): m is Media => !!m) : []), [post, media]);
  if (!post) return <div className="flex h-full items-center justify-center text-muted"><Loader2 className="animate-spin" /></div>;

  const set = (p: Partial<Post>) => setPost({ ...post, ...p });
  const fullCaption = `${post.caption}${post.hashtags.length ? `\n\n${post.hashtags.map((h) => `#${h}`).join(" ")}` : ""}`;
  const tip = tipFor(post.objective, post.network);
  const suggestions = nextSlots(post.objective, post.network);
  const flash = (s: string) => { setMsg(s); setTimeout(() => setMsg(""), 2500); };

  const save = async (extra: Partial<Post> = {}) => {
    const p = { ...post, ...extra };
    if (p.status !== "publicado") p.status = p.scheduledAt ? "agendado" : "rascunho";
    await db.put("posts", p);
    setPost(p);
    return p;
  };

  const genCaption = async () => {
    const m = items[0];
    if (!m) { flash("Adicione uma mídia primeiro."); return; }
    setStatus("escrevendo a legenda…");
    try {
      const style = [...BUILTIN_STYLES, ...(customStyles ?? [])].find((s) => s.id === styleId) ?? null;
      const res = await fetch("/api/edit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: post.caption ? `Melhore esta legenda mantendo a ideia:\n${post.caption}` : "", mode: "caption", media: { kind: m.kind, w: m.w, h: m.h, duration: m.duration }, spec: m.spec ?? defaultSpec(m), transcript: null, style, objective: post.objective, network: post.network, format: post.format, brand }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      set({ caption: j.caption || post.caption, hashtags: j.hashtags?.length ? j.hashtags : post.hashtags });
    } catch (e) { flash(e instanceof Error ? e.message : "Falha na IA."); }
    finally { setStatus(""); }
  };

  // Publicação manual até ligar as APIs do Instagram/TikTok: abre o compartilhar do celular com a mídia
  const share = async () => {
    await navigator.clipboard?.writeText(fullCaption).catch(() => {});
    const files = items.map((m) => new File([m.blob], `postai-${m.id}.${extOf(m)}`, { type: m.blob.type || (m.kind === "image" ? "image/jpeg" : "video/mp4") }));
    if (files.length && navigator.canShare?.({ files })) {
      try { await navigator.share({ files, text: fullCaption }); flash("Legenda copiada: cole no app da rede."); }
      catch { /* usuário cancelou */ }
    } else {
      items.forEach((m) => download(m.blob, `postai-${m.id}.${extOf(m)}`));
      flash("Mídia baixada e legenda copiada (compartilhar não disponível neste navegador).");
    }
  };

  const reminder = () => {
    if (!post.scheduledAt) { flash("Escolha a data e hora primeiro."); return; }
    const z = (t: number) => new Date(t).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (c) => `\\${c}`);
    const net = post.network === "tiktok" ? "TikTok" : "Instagram";
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Postai//PT", "BEGIN:VEVENT", `UID:${post.id}@postai`, `DTSTAMP:${z(Date.now())}`,
      `DTSTART:${z(post.scheduledAt)}`, `DTEND:${z(post.scheduledAt + 15 * 60_000)}`, `SUMMARY:${esc(`Postar no ${net}: ${post.caption.split("\n")[0].slice(0, 60)}`)}`,
      `DESCRIPTION:${esc(`Abra o Postai > Agenda e toque em Publicar.\n\n${fullCaption}`)}`,
      "BEGIN:VALARM", "TRIGGER:-PT0M", "ACTION:DISPLAY", "DESCRIPTION:Hora de postar", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    download(new Blob([ics], { type: "text/calendar" }), `postar-${post.id}.ics`);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="safe-t flex items-center gap-2 border-b border-line px-3 py-2">
        <button onClick={back} aria-label="Voltar"><ArrowLeft size={22} /></button>
        <span className="font-semibold">{postId ? "Post" : "Novo post"}</span>
        {post.status === "publicado" && <span className="text-xs text-ok">publicado</span>}
        <button className="btn btn-primary ml-auto" onClick={async () => { await save(); flash("Post salvo na agenda."); }}>Salvar</button>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 pb-10">
        {/* mídias */}
        <div className="flex gap-2 overflow-x-auto">
          {items.map((m, i) => (
            <div key={m.id} className="relative h-28 w-24 shrink-0 overflow-hidden rounded-lg bg-panel">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.thumb} alt="" className="h-full w-full object-cover" onClick={() => go({ name: "editor", mediaId: m.id })} />
              <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px]">{i + 1}</span>
              <button className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5" onClick={() => set({ mediaIds: post.mediaIds.filter((x) => x !== m.id) })} aria-label="Tirar"><X size={12} /></button>
            </div>
          ))}
          <button className="flex h-28 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line text-xs text-muted" onClick={() => setPicker(true)}><Plus size={18} />mídia</button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Chips<Network> value={post.network} onChange={(network) => set({ network, format: items[0] ? defaultFormat(network, items[0]) : FORMATS[network][0].id })} options={[{ id: "instagram", label: "Instagram" }, { id: "tiktok", label: "TikTok" }]} />
        </div>
        <Chips<PostFormat> value={post.format} onChange={(format) => set({ format })} options={FORMATS[post.network]} />
        <div>
          <span className="lbl">Objetivo</span>
          <select className="inp" value={post.objective} onChange={(e) => set({ objective: e.target.value as ObjectiveId })}>
            {OBJECTIVES.map((o) => <option key={o.id} value={o.id}>{o.emoji} {o.label}</option>)}
          </select>
        </div>

        <div>
          <span className="lbl flex items-center">Legenda<button className="ml-auto flex items-center gap-1 text-accent" disabled={!!status} onClick={genCaption}>{status ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} {post.caption ? "melhorar com IA" : "escrever com IA"}</button></span>
          <textarea className="inp" rows={7} value={post.caption} onChange={(e) => set({ caption: e.target.value })} placeholder="Escreva ou peça para a IA" />
          <input className="inp mt-2" placeholder="hashtags separadas por espaço" value={post.hashtags.map((h) => `#${h}`).join(" ")}
            onChange={(e) => set({ hashtags: e.target.value.split(/[\s,]+/).map((h) => h.replace(/^#+/, "")).filter(Boolean) })} />
          <p className="mt-1 text-right text-[11px] text-muted">{fullCaption.length}/{post.network === "tiktok" ? 4000 : 2200} caracteres</p>
        </div>

        {/* agendamento */}
        <div className="card space-y-2 p-3">
          <span className="lbl">Quando postar</span>
          <input type="datetime-local" className="inp" value={post.scheduledAt ? toLocalInput(post.scheduledAt) : ""} onChange={(e) => set({ scheduledAt: e.target.value ? new Date(e.target.value).getTime() : null })} />
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((d) => <button key={+d} className={`chip ${post.scheduledAt === +d ? "chip-on" : ""}`} onClick={() => set({ scheduledAt: +d })}>{fmtDateTime(+d)}</button>)}
          </div>
          <p className="text-xs text-muted">Melhores janelas para {OBJECTIVES.find((o) => o.id === post.objective)?.label.toLowerCase()} no {post.network === "tiktok" ? "TikTok" : "Instagram"}: {tip.slots.map(describeSlot).join(" · ")}. {tip.why}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button className="btn btn-primary col-span-2" onClick={share} disabled={!items.length}><Share2 size={16} /> Publicar agora (compartilhar)</button>
          <button className="btn" onClick={() => navigator.clipboard.writeText(fullCaption).then(() => flash("Legenda copiada."))}><Copy size={14} /> Copiar legenda</button>
          <button className="btn" onClick={() => items.forEach((m) => download(m.blob, `postai-${m.id}.${extOf(m)}`))} disabled={!items.length}><Download size={14} /> Baixar mídia</button>
          <button className="btn" onClick={reminder}><BellRing size={14} /> Lembrete no celular</button>
          <button className="btn" onClick={async () => { await save({ status: "publicado" }); flash("Marcado como publicado."); }}><CheckCircle2 size={14} /> Já publiquei</button>
          {postId && <button className="btn col-span-2 text-bad" onClick={async () => { if (confirm("Apagar este post da agenda? (as mídias continuam na biblioteca)")) { await db.del("posts", post.id); back(); } }}><Trash2 size={14} /> Apagar post</button>}
        </div>
        <p className="text-[11px] text-muted">A publicação automática no Instagram e no TikTok entra numa próxima fase. Por enquanto: no horário, toque em Publicar — a legenda é copiada e o celular abre o compartilhar com a mídia.</p>
      </div>

      {msg && <div className="safe-b fixed inset-x-4 bottom-4 z-50 rounded-lg bg-panel-2 p-3 text-center text-sm shadow-lg">{msg}</div>}
      {picker && (
        <Sheet title="Escolher mídias" onClose={() => setPicker(false)}>
          <div className="grid grid-cols-3 gap-1">
            {(media ?? []).sort((a, b) => b.created - a.created).map((m) => {
              const on = post.mediaIds.includes(m.id);
              return (
                <button key={m.id} className={`relative aspect-square overflow-hidden rounded ${on ? "ring-2 ring-accent" : ""}`} onClick={() => set({ mediaIds: on ? post.mediaIds.filter((x) => x !== m.id) : [...post.mediaIds, m.id] })}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.thumb} alt="" className="h-full w-full object-cover" />
                  {on && <span className="absolute right-1 top-1 rounded-full bg-accent px-1.5 text-[10px] font-bold">{post.mediaIds.indexOf(m.id) + 1}</span>}
                </button>
              );
            })}
          </div>
          <button className="btn btn-primary mt-3 w-full" onClick={() => setPicker(false)}>Pronto</button>
        </Sheet>
      )}
    </div>
  );
}
