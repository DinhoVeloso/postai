"use client";
import { useState } from "react";
import { ArrowRight, CalendarClock, Camera, Lightbulb, Palette, Send, Sparkles, X } from "lucide-react";
import { AccountCards, useSocial } from "./social";

const FEATURES = [
  { icon: Camera, title: "Fotos e vídeos", text: "Tire na hora ou importe da galeria." },
  { icon: Sparkles, title: "Edição com IA", text: "Peça em português: a IA corta, ajusta, escreve textos e legendas." },
  { icon: Palette, title: "Estilos prontos", text: "Predefinições de edição e escrita, ou crie a sua." },
  { icon: CalendarClock, title: "Agenda", text: "Programe os posts e receba o aviso na hora." },
  { icon: Lightbulb, title: "Melhores horários", text: "Dicas por objetivo: venda, marca pessoal, evento…" },
  { icon: Send, title: "Publicar", text: "Conecte o Instagram e o TikTok para postar daqui." },
];

/** Tela de boas-vindas da primeira vez: apresenta o app e oferece conectar as redes. */
export function Onboarding({ startAtAccounts, notice, onDone }: { startAtAccounts: boolean; notice: string; onDone: () => void }) {
  const [step, setStep] = useState<0 | 1>(startAtAccounts ? 1 : 0);
  const social = useSocial();
  const anyConnected = !!(social.status?.instagram.account || social.status?.tiktok.account);

  return (
    <div className="safe-t safe-b fixed inset-0 z-40 overflow-y-auto bg-bg">
      <div className="mx-auto flex min-h-full max-w-2xl flex-col p-5 md:justify-center md:p-8">
        <div className="flex items-center">
          <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-2xl font-bold text-transparent">Postai</span>
          <button className="ml-auto flex items-center gap-1 text-sm text-muted hover:text-text" onClick={onDone}>Pular <X size={16} /></button>
        </div>

        {step === 0 ? (
          <>
            <h1 className="mt-8 text-3xl font-bold leading-tight md:text-4xl">Crie, edite e programe seus posts num só lugar.</h1>
            <p className="mt-2 text-muted">Para você e para os clientes que você atende.</p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <div key={title} className="card flex gap-3 p-3">
                  <Icon size={20} className="mt-0.5 shrink-0 text-accent" />
                  <div><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted">{text}</p></div>
                </div>
              ))}
            </div>
            <div className="mt-auto flex flex-col gap-2 pt-8 sm:flex-row-reverse md:mt-8">
              <button className="btn btn-primary flex-1 py-3" onClick={() => setStep(1)}>Conectar minhas redes <ArrowRight size={16} /></button>
              <button className="btn flex-1 py-3" onClick={onDone}>Pular e conhecer o app</button>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-8 text-2xl font-bold md:text-3xl">Conecte suas redes</h1>
            <p className="mt-2 text-sm text-muted">Assim, depois de editar, você publica ou agenda direto daqui. Dá para fazer isso agora ou depois em <b>Estilos → Contas conectadas</b>.</p>
            {notice && <p className="mt-4 rounded-lg border border-line bg-panel-2 p-3 text-sm">{notice}</p>}
            <div className="mt-5"><AccountCards {...social} /></div>
            <ul className="mt-4 space-y-1 text-xs text-muted">
              <li>• Instagram: precisa ser conta <b>profissional</b> (Criador de conteúdo ou Empresa). Dá para mudar de graça no próprio app do Instagram.</li>
              <li>• As chaves de acesso ficam guardadas só neste aparelho, criptografadas. O Postai nunca vê sua senha.</li>
            </ul>
            <div className="mt-auto flex flex-col gap-2 pt-8 sm:flex-row-reverse md:mt-8">
              <button className="btn btn-primary flex-1 py-3" onClick={onDone}>{anyConnected ? "Começar" : "Fazer isso depois"} <ArrowRight size={16} /></button>
              <button className="btn flex-1 py-3" onClick={() => setStep(0)}>Voltar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
