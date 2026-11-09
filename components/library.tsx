"use client";
import { useMemo, useRef, useState } from "react";
import { Download, Film, ImagePlus, Pencil, Send, Trash2, Wand2 } from "lucide-react";
import { db } from "@/lib/db";
import { download, extOf, fmtTime, importFiles } from "@/lib/media";
import type { Media } from "@/lib/types";
import { Empty, Sheet, useStore, Chips } from "./ui";
import type { Nav } from "./app";

type Filter = "todas" | "fotos" | "videos" | "editadas";

export function Library({ go }: { go: Nav }) {
  const media = useStore("media");
  const [filter, setFilter] = useState<Filter>("todas");
  const [sel, setSel] = useState<Media | null>(null);
  const [busy, setBusy] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const list = useMemo(() => (media ?? [])
    .filter((m) => filter === "todas" || (filter === "fotos" ? m.kind === "image" : filter === "videos" ? m.kind === "video" : !!m.parentId))
    .sort((a, b) => b.created - a.created), [media, filter]);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(`importando ${files.length} arquivo(s)…`);
    try {
      const added = await importFiles(files);
      if (added.length === 1) go({ name: "editor", mediaId: added[0].id });
    } catch (e) { alert(e instanceof Error ? e.message : "Falha ao importar."); }
    finally { setBusy(""); if (input.current) input.current.value = ""; }
  };

  return (
    <div className="safe-t">
      <header className="flex items-center gap-2 px-4 pb-2 pt-4">
        <h1 className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-2xl font-bold text-transparent">Postai</h1>
        <button className="btn btn-primary ml-auto" onClick={() => input.current?.click()}><ImagePlus size={16} /> Importar</button>
        <input ref={input} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      </header>
      <div className="flex gap-1.5 overflow-x-auto px-4 pb-3">
        <Chips<Filter> value={filter} onChange={setFilter} options={[{ id: "todas", label: "Todas" }, { id: "fotos", label: "Fotos" }, { id: "videos", label: "Vídeos" }, { id: "editadas", label: "Editadas" }]} />
      </div>
      {busy && <p className="px-4 pb-2 text-xs text-muted">{busy}</p>}
      {media && !list.length && (
        <Empty icon={<Wand2 size={40} />} title="Nenhuma mídia ainda">
          <p className="text-sm">Tire uma foto ou grave um vídeo na aba Câmera, ou importe da galeria. Depois é só editar com IA e planejar o post.</p>
        </Empty>
      )}
      <div className="grid grid-cols-3 gap-0.5 px-0.5">
        {list.map((m) => (
          <button key={m.id} className="relative aspect-square overflow-hidden bg-panel" onClick={() => setSel(m)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.thumb} alt="" className="h-full w-full object-cover" />
            {m.kind === "video" && <span className="absolute bottom-1 right-1 flex items-center gap-0.5 rounded bg-black/60 px-1 text-[10px]"><Film size={10} />{fmtTime(m.duration)}</span>}
            {m.parentId && <span className="absolute left-1 top-1 rounded bg-accent px-1 text-[10px] font-semibold">editada</span>}
          </button>
        ))}
      </div>

      {sel && (
        <Sheet title={sel.kind === "video" ? `Vídeo · ${fmtTime(sel.duration)}` : "Foto"} onClose={() => setSel(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sel.thumb} alt="" className="mx-auto mb-3 max-h-48 rounded-lg" />
          <p className="mb-3 text-center text-xs text-muted">{sel.w}×{sel.h} · {(sel.blob.size / 1e6).toFixed(1)} MB · {new Date(sel.created).toLocaleString("pt-BR")}</p>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn btn-primary" onClick={() => { setSel(null); go({ name: "editor", mediaId: sel.id }); }}><Pencil size={16} /> Editar</button>
            <button className="btn" onClick={() => { setSel(null); go({ name: "post", draft: { mediaIds: [sel.id] } }); }}><Send size={16} /> Criar post</button>
            <button className="btn" onClick={() => download(sel.blob, `postai-${sel.id}.${extOf(sel)}`)}><Download size={16} /> Baixar</button>
            <button className="btn text-bad" onClick={async () => { if (confirm("Apagar esta mídia do aparelho?")) { await db.del("media", sel.id); setSel(null); } }}><Trash2 size={16} /> Apagar</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
