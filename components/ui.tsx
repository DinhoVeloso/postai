"use client";
import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { db, onChange } from "@/lib/db";
import type { Media, Post, Style } from "@/lib/types";

type Stores = { media: Media; posts: Post; styles: Style };

/** Lista de um "armário" do banco local, atualizada quando algo muda. */
export function useStore<N extends keyof Stores>(name: N) {
  const [items, setItems] = useState<Stores[N][] | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () => db.all(name).then((v) => alive && setItems(v)).catch(() => alive && setItems([]));
    load();
    const off = onChange(load);
    return () => { alive = false; off(); };
  }, [name]);
  return items;
}

/** Preferência simples guardada no aparelho. */
export function usePref<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(initial);
  useEffect(() => {
    try { const s = localStorage.getItem(`postai:${key}`); if (s) setV(JSON.parse(s)); } catch { /* sem armazenamento */ }
  }, [key]);
  const set = (nv: T) => { setV(nv); try { localStorage.setItem(`postai:${key}`, JSON.stringify(nv)); } catch { /* ignora */ } };
  return [v, set] as const;
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div className="safe-b max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-line bg-panel p-4 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center">
          <h3 className="font-semibold">{title}</h3>
          <button className="ml-auto text-muted" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Slider({ label, value, min, max, step = 0.01, onChange, fmt }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; fmt?: (v: number) => string }) {
  return (
    <label className="block">
      <span className="lbl flex">{label}<span className="ml-auto tabular-nums text-text">{fmt ? fmt(value) : value.toFixed(2)}</span></span>
      <input type="range" className="w-full accent-[var(--accent)]" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </label>
  );
}

export function Chips<T extends string | number>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => <button key={String(o.id)} type="button" className={`chip ${o.id === value ? "chip-on" : ""}`} onClick={() => onChange(o.id)}>{o.label}</button>)}
    </div>
  );
}

export const SWATCHES = ["#ffffff", "#111111", "#ffe600", "#ec4899", "#e11d48", "#f97316", "#22c55e", "#2563eb", "#a855f7", "#f5f5f4"];

export function Swatches({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {SWATCHES.map((c) => <button key={c} type="button" aria-label={c} onClick={() => onChange(c)} className={`h-7 w-7 rounded-full border-2 ${value.toLowerCase() === c ? "border-accent" : "border-line"}`} style={{ background: c }} />)}
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-7 w-9 rounded border border-line bg-transparent" />
    </div>
  );
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-muted">
      <div className="text-accent">{icon}</div>
      <p className="font-medium text-text">{title}</p>
      {children}
    </div>
  );
}

export const fmtDateTime = (t: number) => new Date(t).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
