import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, configured, cookieOpts, refresh, seal, unseal } from "@/lib/social";
import type { Network } from "@/lib/types";

export type SocialStatus = Record<Network, { configured: boolean; account: { name: string; avatar?: string } | null }>;

/** Quais redes estão conectadas neste aparelho (sem expor as chaves). */
export async function GET(req: NextRequest) {
  const out = {} as SocialStatus;
  const updates: [Network, string | null][] = [];
  for (const n of ["instagram", "tiktok"] as Network[]) {
    const raw = req.cookies.get(COOKIE(n))?.value;
    let acc = unseal(raw);
    if (acc) {
      const fresh = await refresh(acc);
      if (fresh !== acc) updates.push([n, fresh ? seal(fresh) : null]);
      acc = fresh;
    } else if (raw) updates.push([n, null]);
    out[n] = { configured: configured(n), account: acc ? { name: acc.name, avatar: acc.avatar } : null };
  }
  const res = NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
  for (const [n, v] of updates) {
    if (v) res.cookies.set(COOKIE(n), v, cookieOpts);
    else res.cookies.delete(COOKIE(n));
  }
  return res;
}

/** Desconecta uma rede deste aparelho. */
export async function DELETE(req: NextRequest) {
  const n = req.nextUrl.searchParams.get("network");
  const res = NextResponse.json({ ok: true });
  if (n === "instagram" || n === "tiktok") res.cookies.delete(COOKIE(n));
  return res;
}
