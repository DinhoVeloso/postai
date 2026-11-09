import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { authorizeUrl, configured, isNetwork, STATE_COOKIE } from "@/lib/social";

/** Abre o login da rede. Volta para /api/social/[rede]/callback. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/social/[network]/connect">) {
  const { network } = await ctx.params;
  const origin = req.nextUrl.origin;
  if (!isNetwork(network)) return NextResponse.redirect(`${origin}/`);
  if (!configured(network)) return NextResponse.redirect(`${origin}/?social_error=${network}:pendente`);
  const state = `${network}.${randomBytes(16).toString("hex")}`;
  const res = NextResponse.redirect(authorizeUrl(network, origin, state));
  res.cookies.set(STATE_COOKIE, state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  return res;
}
