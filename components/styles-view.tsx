"use client";
import { useState } from "react";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { db, uid } from "@/lib/db";
import { FONT_LABEL } from "@/lib/fonts";
import { BUILTIN_STYLES } from "@/lib/styles";
import type { Aspect, FontId, Style, TextBg } from "@/lib/types";
import { Chips, Sheet, Swatches, usePref, useStore } from "./ui";

const BASE = BUILTIN_STYLES[3];

export function StylesView() {
  const custom = useStore("styles");
  const [brand, setBrand] = usePref<string>("brand", "");
  const [styleId, setStyleId] = usePref<string>("style", "");
  const [editing, setEditing] = useState<Style | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="safe-t space-y-4 p-4">
      <h1 className="text-xl font-bold">Estilos</h1>

      <section className="card space-y-2 p-3">
        <h2 className="text-sm font-semibold">Sobre você / sua marca</h2>
        <textarea className="inp text-sm" rows={3} value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ex.: Ana, confeiteira em Campinas, bolos de festa por encomenda; público mulheres 25–45; tom carinhoso e divertido." />
        <p className="text-[11px] text-muted">A IA usa isso em todas as legendas e edições.</p>
      </section>

      <section className="space-y-2">
        <div className="flex items-center">
          <h2 className="text-sm font-semibold">Meus estilos</h2>
          <button className="btn btn-primary ml-auto" onClick={() => setEditing({ ...structuredClone(BASE), id: uid(), name: "", description: "", inspiration: "", custom: true })}><Plus size={16} /> Criar estilo</button>
        </div>
        {custom && !custom.length && <p className="text-xs text-muted">Crie um estilo inspirado num criador, numa marca ou numa estética. A IA descreve o jeito de editar e escrever, e você ajusta.</p>}
        {(custom ?? []).map((s) => <StyleRow key={s.id} s={s} active={s.id === styleId} open={open === s.id} onOpen={() => setOpen(open === s.id ? null : s.id)} onUse={() => setStyleId(s.id)} onEdit={() => setEditing(structuredClone(s))} />)}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Estilos prontos</h2>
        {BUILTIN_STYLES.map((s) => <StyleRow key={s.id} s={s} active={s.id === styleId} open={open === s.id} onOpen={() => setOpen(open === s.id ? null : s.id)} onUse={() => setStyleId(s.id)} />)}
      </section>

      {editing && <StyleForm initial={editing} onClose={() => setEditing(null)} onSaved={(s) => { setStyleId(s.id); setEditing(null); }} />}
    </div>
  );
}

function StyleRow({ s, active, open, onOpen, onUse, onEdit }: { s: Style; active: boolean; open: boolean; onOpen: () => void; onUse: () => void; onEdit?: () => void }) {
  return (
    <div className={`card p-3 ${active ? "border-accent" : ""}`}>
      <button className="flex w-full items-center text-left" onClick={onOpen}>
        <span className="font-medium">{s.name}</span>
        {active && <span className="ml-2 text-[10px] text-accent">em uso</span>}
        <span className="ml-auto text-xs text-muted">{s.aspect}</span>
      </button>
      {s.inspiration && <p className="text-[11px] text-muted">inspirado em: {s.inspiration}</p>}
      {open && (
        <div className="mt-2 space-y-2 text-sm">
          <p className="text-muted">{s.description}</p>
          <p className="text-xs"><b>Legenda:</b> {s.captionTone}</p>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={onUse}>Usar este estilo</button>
            {onEdit && <button className="btn" onClick={onEdit}>Editar</button>}
          </div>
        </div>
      )}
    </div>
  );
}

function StyleForm({ initial, onClose, onSaved }: { initial: Style; onClose: () => void; onSaved: (s: Style) => void }) {
  const [s, setS] = useState<Style>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (p: Partial<Style>) => setS({ ...s, ...p });
  const setText = (p: Partial<Style["text"]>) => setS({ ...s, text: { ...s.text, ...p } });

  const fromAi = async () => {
    if (!s.inspiration?.trim()) { setErr("Escreva a inspiração primeiro."); return; }
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/style", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inspiration: s.inspiration }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      const num = (v: unknown, lo: number, hi: number, fb: number) => (typeof v === "number" ? Math.min(hi, Math.max(lo, v)) : fb);
      const hex = (v: unknown, fb: string) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : fb);
      const t = j.text ?? {}, a = j.adjust ?? {};
      setS({
        ...s, name: s.name || String(j.name ?? "").slice(0, 40), description: String(j.description ?? ""), captionTone: String(j.captionTone ?? s.captionTone),
        hashtagCount: Math.round(num(j.hashtagCount, 0, 15, s.hashtagCount)), aspect: (["4:5", "9:16", "1:1"].includes(j.aspect) ? j.aspect : s.aspect) as Aspect,
        speed: num(j.speed, 0.75, 1.5, 1), subtitles: typeof j.subtitles === "boolean" ? j.subtitles : s.subtitles,
        adjust: { brightness: num(a.brightness, 0.6, 1.5, 1), contrast: num(a.contrast, 0.6, 1.6, 1), saturation: num(a.saturation, 0, 2, 1), warmth: num(a.warmth, -1, 1, 0), vignette: num(a.vignette, 0, 1, 0) },
        text: { font: (Object.keys(FONT_LABEL).includes(t.font) ? t.font : s.text.font) as FontId, color: hex(t.color, s.text.color), bg: (["none", "shadow", "outline", "box"].includes(t.bg) ? t.bg : s.text.bg) as TextBg, bgColor: hex(t.bgColor, s.text.bgColor), bold: t.bold ?? s.text.bold, upper: t.upper ?? s.text.upper },
      });
    } catch (e) { setErr(e instanceof Error ? e.message : "Falha na IA."); }
    finally { setBusy(false); }
  };

  return (
    <Sheet title={initial.name ? "Editar estilo" : "Novo estilo"} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <span className="lbl">Inspiração (criador, marca ou estética)</span>
          <input className="inp" value={s.inspiration ?? ""} onChange={(e) => set({ inspiration: e.target.value })} placeholder="Ex.: perfis de confeitaria gourmet, revista de moda, um youtuber de humor" />
          <button className="btn mt-2 w-full" disabled={busy} onClick={fromAi}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Descrever o estilo com IA</button>
          <p className="mt-1 text-[11px] text-muted">É só o jeito de editar e escrever: os posts não usam nome, rosto ou voz de ninguém.</p>
        </div>
        <div><span className="lbl">Nome</span><input className="inp" value={s.name} onChange={(e) => set({ name: e.target.value })} /></div>
        <div><span className="lbl">Como são os posts</span><textarea className="inp text-sm" rows={4} value={s.description} onChange={(e) => set({ description: e.target.value })} /></div>
        <div><span className="lbl">Tom da legenda</span><input className="inp" value={s.captionTone} onChange={(e) => set({ captionTone: e.target.value })} /></div>
        <div><span className="lbl">Formato</span><Chips<Aspect> value={s.aspect} onChange={(aspect) => set({ aspect })} options={[{ id: "4:5", label: "4:5" }, { id: "1:1", label: "1:1" }, { id: "9:16", label: "9:16" }]} /></div>
        <div><span className="lbl">Fonte dos textos</span><Chips<FontId> value={s.text.font} onChange={(font) => setText({ font })} options={(Object.keys(FONT_LABEL) as FontId[]).map((f) => ({ id: f, label: FONT_LABEL[f] }))} /></div>
        <div><span className="lbl">Cor do texto</span><Swatches value={s.text.color} onChange={(color) => setText({ color })} /></div>
        <div><span className="lbl">Fundo do texto</span><Chips<TextBg> value={s.text.bg} onChange={(bg) => setText({ bg })} options={[{ id: "none", label: "Nenhum" }, { id: "shadow", label: "Sombra" }, { id: "outline", label: "Contorno" }, { id: "box", label: "Caixa" }]} /></div>
        {(s.text.bg === "box" || s.text.bg === "outline") && <div><span className="lbl">Cor do fundo</span><Swatches value={s.text.bgColor} onChange={(bgColor) => setText({ bgColor })} /></div>}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.subtitles} onChange={(e) => set({ subtitles: e.target.checked })} /> Legendas automáticas nos vídeos</label>
        {err && <p className="text-xs text-bad">{err}</p>}
        <div className="flex gap-2">
          <button className="btn btn-primary flex-1" disabled={!s.name.trim() || !s.description.trim()} onClick={async () => { const saved = await db.put("styles", { ...s, custom: true }); onSaved(saved); }}>Salvar estilo</button>
          {initial.name && <button className="btn text-bad" onClick={async () => { if (confirm("Apagar este estilo?")) { await db.del("styles", s.id); onClose(); } }}><Trash2 size={14} /></button>}
        </div>
      </div>
    </Sheet>
  );
}
