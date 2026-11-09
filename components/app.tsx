"use client";
import { useEffect, useState } from "react";
import { Calendar, Camera, Download, Images, Palette } from "lucide-react";
import { Library } from "./library";
import { CameraView } from "./camera";
import { Editor } from "./editor";
import { Agenda } from "./agenda";
import { PostEditor, type PostDraft } from "./post-editor";
import { StylesView } from "./styles-view";

export type View =
  | { name: "library" }
  | { name: "camera" }
  | { name: "editor"; mediaId: string }
  | { name: "agenda" }
  | { name: "styles" }
  | { name: "post"; postId?: string; draft?: PostDraft };

export type Nav = (v: View) => void;

export function App() {
  const [stack, setStack] = useState<View[]>([{ name: "library" }]);
  const view = stack[stack.length - 1];

  // botão "voltar" do celular volta uma tela dentro do app
  useEffect(() => {
    const onPop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go: Nav = (v) => {
    const tab = ["library", "agenda", "styles"].includes(v.name);
    if (tab) setStack([v]);
    else { history.pushState(null, ""); setStack((s) => [...s, v]); }
  };
  const back = () => (stack.length > 1 ? history.back() : setStack([{ name: "library" }]));

  const full = view.name === "camera" || view.name === "editor" || view.name === "post";
  const install = useInstall();
  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* PC: menu lateral */}
      <nav className="hidden w-56 shrink-0 flex-col gap-1 border-r border-line bg-panel p-3 md:flex">
        <div className="mb-4 px-2 pt-2 text-2xl font-bold"><span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">Postai</span></div>
        <Side icon={<Images size={18} />} label="Mídias" on={view.name === "library" || view.name === "editor"} onClick={() => go({ name: "library" })} />
        <Side icon={<Camera size={18} />} label="Câmera" on={view.name === "camera"} onClick={() => go({ name: "camera" })} />
        <Side icon={<Calendar size={18} />} label="Agenda" on={view.name === "agenda" || view.name === "post"} onClick={() => go({ name: "agenda" })} />
        <Side icon={<Palette size={18} />} label="Estilos" on={view.name === "styles"} onClick={() => go({ name: "styles" })} />
        <div className="mt-auto space-y-2 text-[11px] text-muted">
          {install && <button className="btn w-full" onClick={install}><Download size={14} /> Instalar no PC</button>}
          <p className="px-1">Atalhos no editor: espaço toca/pausa · Ctrl+Z desfaz · Ctrl+S salva · Delete apaga o texto</p>
        </div>
      </nav>
      <main className={`mx-auto min-h-0 w-full flex-1 overflow-y-auto ${full ? "md:max-w-none" : "max-w-2xl md:max-w-6xl"}`}>
        {view.name === "library" && <Library go={go} />}
        {view.name === "camera" && <CameraView go={go} back={back} />}
        {view.name === "editor" && <Editor key={view.mediaId} mediaId={view.mediaId} go={go} back={back} />}
        {view.name === "agenda" && <Agenda go={go} />}
        {view.name === "styles" && <StylesView />}
        {view.name === "post" && <PostEditor key={view.postId ?? "novo"} postId={view.postId} draft={view.draft} back={back} go={go} />}
      </main>
      {!full && (
        <nav className="safe-b grid grid-cols-4 border-t border-line bg-panel md:hidden">
          <Tab icon={<Images size={22} />} label="Mídias" on={view.name === "library"} onClick={() => go({ name: "library" })} />
          <Tab icon={<Camera size={22} />} label="Câmera" on={false} onClick={() => go({ name: "camera" })} />
          <Tab icon={<Calendar size={22} />} label="Agenda" on={view.name === "agenda"} onClick={() => go({ name: "agenda" })} />
          <Tab icon={<Palette size={22} />} label="Estilos" on={view.name === "styles"} onClick={() => go({ name: "styles" })} />
        </nav>
      )}
    </div>
  );
}

function Side({ icon, label, on, onClick }: { icon: React.ReactNode; label: string; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${on ? "bg-accent/15 text-white" : "text-muted hover:bg-panel-2 hover:text-text"}`}>
      <span className={on ? "text-accent" : ""}>{icon}</span>{label}
    </button>
  );
}

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Botão "Instalar" do Chrome/Edge no PC (some quando já está instalado). */
function useInstall() {
  const [ev, setEv] = useState<InstallEvent | null>(null);
  useEffect(() => {
    const on = (e: Event) => { e.preventDefault(); setEv(e as InstallEvent); };
    const done = () => setEv(null);
    window.addEventListener("beforeinstallprompt", on);
    window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", on); window.removeEventListener("appinstalled", done); };
  }, []);
  return ev ? () => { ev.prompt(); ev.userChoice.finally(() => setEv(null)); } : null;
}

function Tab({ icon, label, on, onClick }: { icon: React.ReactNode; label: string; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-0.5 pt-2 text-[11px] ${on ? "text-accent" : "text-muted"}`}>
      {icon}{label}
    </button>
  );
}
