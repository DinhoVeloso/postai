"use client";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Link2, Loader2, LogOut } from "lucide-react";
import type { Network } from "@/lib/types";
import type { SocialStatus } from "@/app/api/social/status/route";

export const NET_LABEL: Record<Network, string> = { instagram: "Instagram", tiktok: "TikTok" };
const NET_COLOR: Record<Network, string> = { instagram: "from-[#f58529] via-[#dd2a7b] to-[#8134af]", tiktok: "from-[#25f4ee] via-[#111] to-[#fe2c55]" };

/** Estado das contas conectadas neste aparelho. */
export function useSocial() {
  const [status, setStatus] = useState<SocialStatus | null>(null);
  const load = useCallback(() => fetch("/api/social/status", { cache: "no-store" }).then((r) => r.json()).then(setStatus).catch(() => setStatus(null)), []);
  useEffect(() => { load(); }, [load]);
  const disconnect = async (n: Network) => { await fetch(`/api/social/status?network=${n}`, { method: "DELETE" }); load(); };
  return { status, disconnect };
}

// navegação completa de propósito: a rota do servidor redireciona para o login da rede
// eslint-disable-next-line @next/next/no-location-assign-relative-destination
export const connect = (n: Network) => { window.location.href = `/api/social/${n}/connect`; };

/** Mensagem amigável para o retorno do login (?social_error=rede:motivo). */
export function socialErrorText(raw: string) {
  const [n, ...rest] = raw.split(":");
  const why = rest.join(":");
  const net = NET_LABEL[n as Network] ?? n;
  if (why === "pendente") return `A conexão com o ${net} ainda não foi ativada: falta cadastrar o app de desenvolvedor da rede (veja o passo a passo no README).`;
  if (why === "cancelado") return `Login no ${net} cancelado.`;
  if (why === "sessao") return `O login no ${net} expirou. Tente de novo.`;
  return `Não foi possível conectar o ${net}: ${why}`;
}

export function AccountCards({ status, disconnect }: ReturnType<typeof useSocial>) {
  const [busy, setBusy] = useState<Network | null>(null);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {(["instagram", "tiktok"] as Network[]).map((n) => {
        const s = status?.[n];
        const acc = s?.account;
        return (
          <div key={n} className="card flex items-center gap-3 p-3">
            <div className={`h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br ${NET_COLOR[n]} p-0.5`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {acc?.avatar ? <img src={acc.avatar} alt="" className="h-full w-full rounded-full object-cover" /> : <div className="flex h-full w-full items-center justify-center rounded-full bg-panel text-xs font-bold">{n === "instagram" ? "IG" : "TT"}</div>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{NET_LABEL[n]}</p>
              <p className="truncate text-xs text-muted">
                {!status ? "verificando…" : acc ? <span className="inline-flex items-center gap-1 text-ok"><CheckCircle2 size={12} /> {acc.name}</span> : s?.configured ? "não conectado" : "aguardando ativação"}
              </p>
            </div>
            {acc ? (
              <button className="btn" onClick={async () => { setBusy(n); await disconnect(n); setBusy(null); }} aria-label={`Desconectar ${NET_LABEL[n]}`}>
                {busy === n ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
              </button>
            ) : (
              <button className="btn btn-primary" disabled={!status || busy === n} onClick={() => { setBusy(n); connect(n); }}>
                {busy === n ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />} Conectar
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
