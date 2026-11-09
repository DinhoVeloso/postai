import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, cookieOpts, exchange, isNetwork, seal, STATE_COOKIE } from "@/lib/social";

/** A rede devolve o usuário aqui depois do login. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/social/[network]/callback">) {
  const { network } = await ctx.params;
  const origin = req.nextUrl.origin;
  const q = req.nextUrl.searchParams;
  const fail = (why: string) => {
    const res = NextResponse.redirect(`${origin}/?social_error=${encodeURIComponent(`${network}:${why}`)}`);
    res.cookies.delete(STATE_COOKIE);
    return res;
  };
  if (!isNetwork(network)) return NextResponse.redirect(`${origin}/`);
  if (q.get("error")) return fail(q.get("error") === "access_denied" ? "cancelado" : (q.get("error_description") ?? q.get("error")!).slice(0, 120));
  const code = q.get("code");
  if (!code || !q.get("state") || q.get("state") !== req.cookies.get(STATE_COOKIE)?.value) return fail("sessao");
  try {
    const acc = await exchange(network, origin, code.replace(/#_$/, ""));
    const res = NextResponse.redirect(`${origin}/?connected=${network}`);
    res.cookies.set(COOKIE(network), seal(acc), cookieOpts);
    res.cookies.delete(STATE_COOKIE);
    return res;
  } catch (e) {
    return fail((e instanceof Error ? e.message : "falha").slice(0, 120));
  }
}
