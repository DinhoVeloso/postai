"use client";
import { useEffect, useMemo, useState } from "react";
import { AlarmClock, CalendarPlus, Clock, Lightbulb } from "lucide-react";
import { OBJECTIVES } from "@/lib/marketing";
import { describeSlot, nextSlots, tipFor } from "@/lib/times";
import type { Network, ObjectiveId, Post } from "@/lib/types";
import { Chips, Empty, fmtDateTime, usePref, useStore } from "./ui";
import type { Nav } from "./app";

export function Agenda({ go }: { go: Nav }) {
  const posts = useStore("posts");
  const media = useStore("media");
  const [objective, setObjective] = usePref<ObjectiveId>("objective", "venda");
  const [network, setNetwork] = usePref<Network>("network", "instagram");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id); }, []);

  const tip = tipFor(objective, network);
  const groups = useMemo(() => {
    const p = posts ?? [];
    const due = p.filter((x) => x.status === "agendado" && x.scheduledAt! <= now).sort((a, b) => a.scheduledAt! - b.scheduledAt!);
    const next = p.filter((x) => x.status === "agendado" && x.scheduledAt! > now).sort((a, b) => a.scheduledAt! - b.scheduledAt!);
    const drafts = p.filter((x) => x.status === "rascunho").sort((a, b) => b.created - a.created);
    const done = p.filter((x) => x.status === "publicado").sort((a, b) => (b.scheduledAt ?? b.created) - (a.scheduledAt ?? a.created)).slice(0, 20);
    return { due, next, drafts, done };
  }, [posts, now]);

  const thumb = (p: Post) => media?.find((m) => m.id === p.mediaIds[0])?.thumb;
  const Row = ({ p, hot }: { p: Post; hot?: boolean }) => (
    <button className={`card flex w-full items-center gap-3 p-2 text-left ${hot ? "border-accent" : ""}`} onClick={() => go({ name: "post", postId: p.id })}>
      <div className="h-14 w-12 shrink-0 overflow-hidden rounded bg-panel-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {thumb(p) && <img src={thumb(p)} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{p.caption.split("\n")[0] || "(sem legenda)"}</p>
        <p className="text-xs text-muted">{p.network === "tiktok" ? "TikTok" : "Instagram"} · {p.format} · {p.scheduledAt ? fmtDateTime(p.scheduledAt) : "sem data"}</p>
      </div>
      {hot && <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold">POSTAR</span>}
    </button>
  );

  return (
    <div className="safe-t space-y-4 p-4 md:p-6">
      <header className="flex items-center">
        <h1 className="text-xl font-bold">Agenda</h1>
        <button className="btn btn-primary ml-auto" onClick={() => go({ name: "post" })}><CalendarPlus size={16} /> Novo post</button>
      </header>

      <div className="space-y-4 md:grid md:grid-cols-[340px_1fr] md:items-start md:gap-6 md:space-y-0">
      <section className="card space-y-3 p-3 md:sticky md:top-4">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold"><Lightbulb size={16} className="text-warn" /> Melhores horários</h2>
        <select className="inp" value={objective} onChange={(e) => setObjective(e.target.value as ObjectiveId)}>
          {OBJECTIVES.map((o) => <option key={o.id} value={o.id}>{o.emoji} {o.label}</option>)}
        </select>
        <Chips<Network> value={network} onChange={setNetwork} options={[{ id: "instagram", label: "Instagram" }, { id: "tiktok", label: "TikTok" }]} />
        <ul className="space-y-1 text-sm">{tip.slots.map((s, i) => <li key={i} className="flex items-center gap-2"><Clock size={14} className="text-accent" />{describeSlot(s)}</li>)}</ul>
        <p className="text-xs text-muted">{tip.why}</p>
        <p className="text-xs"><b>Frequência:</b> {tip.frequency}</p>
        <p className="text-xs text-muted">Próximos horários bons: {nextSlots(objective, network, 3).map((d) => fmtDateTime(+d)).join(" · ")}</p>
        <p className="text-[11px] text-muted">São pontos de partida com base em padrões gerais das redes no Brasil. Quando a conta estiver conectada, as dicas passam a usar o desempenho dos seus próprios posts.</p>
      </section>

      <div className="space-y-4">
      {posts && !posts.length && <Empty icon={<AlarmClock size={36} />} title="Nenhum post planejado"><p className="text-sm">Edite uma mídia e toque em “Criar post”, ou crie um post aqui.</p></Empty>}
      {groups.due.length > 0 && <section className="space-y-2"><h2 className="text-sm font-semibold text-accent">Hora de postar</h2>{groups.due.map((p) => <Row key={p.id} p={p} hot />)}</section>}
      {groups.next.length > 0 && <section className="space-y-2"><h2 className="text-sm font-semibold">Agendados</h2>{groups.next.map((p) => <Row key={p.id} p={p} />)}</section>}
      {groups.drafts.length > 0 && <section className="space-y-2"><h2 className="text-sm font-semibold text-muted">Rascunhos</h2>{groups.drafts.map((p) => <Row key={p.id} p={p} />)}</section>}
      {groups.done.length > 0 && <section className="space-y-2"><h2 className="text-sm font-semibold text-muted">Publicados</h2>{groups.done.map((p) => <Row key={p.id} p={p} />)}</section>}
      </div>
      </div>
    </div>
  );
}
