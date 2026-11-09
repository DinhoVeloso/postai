"use client";
import { useEffect, useState } from "react";
import { Calendar, Camera, Images, Palette } from "lucide-react";
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
  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col">
      <main className="min-h-0 flex-1 overflow-y-auto">
        {view.name === "library" && <Library go={go} />}
        {view.name === "camera" && <CameraView go={go} back={back} />}
        {view.name === "editor" && <Editor key={view.mediaId} mediaId={view.mediaId} go={go} back={back} />}
        {view.name === "agenda" && <Agenda go={go} />}
        {view.name === "styles" && <StylesView />}
        {view.name === "post" && <PostEditor key={view.postId ?? "novo"} postId={view.postId} draft={view.draft} back={back} go={go} />}
      </main>
      {!full && (
        <nav className="safe-b grid grid-cols-4 border-t border-line bg-panel">
          <Tab icon={<Images size={22} />} label="Mídias" on={view.name === "library"} onClick={() => go({ name: "library" })} />
          <Tab icon={<Camera size={22} />} label="Câmera" on={false} onClick={() => go({ name: "camera" })} />
          <Tab icon={<Calendar size={22} />} label="Agenda" on={view.name === "agenda"} onClick={() => go({ name: "agenda" })} />
          <Tab icon={<Palette size={22} />} label="Estilos" on={view.name === "styles"} onClick={() => go({ name: "styles" })} />
        </nav>
      )}
    </div>
  );
}

function Tab({ icon, label, on, onClick }: { icon: React.ReactNode; label: string; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-0.5 pt-2 text-[11px] ${on ? "text-accent" : "text-muted"}`}>
      {icon}{label}
    </button>
  );
}
