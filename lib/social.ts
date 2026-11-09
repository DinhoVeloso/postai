import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { Network } from "./types";

/**
 * Conexão com Instagram e TikTok (login OAuth).
 * As chaves de acesso ficam criptografadas num cookie httpOnly deste aparelho:
 * o navegador guarda, mas nem o JavaScript da página consegue ler.
 */

export type Account = {
  network: Network;
  id: string;
  name: string;
  avatar?: string;
  token: string;
  expires: number; // ms
  refresh?: string;
  refreshExpires?: number;
};

export const COOKIE = (n: Network) => `pa_${n}`;
export const STATE_COOKIE = "pa_oauth_state";
const YEAR = 60 * 60 * 24 * 365;

const CFG = {
  instagram: { id: process.env.INSTAGRAM_APP_ID, secret: process.env.INSTAGRAM_APP_SECRET },
  tiktok: { id: process.env.TIKTOK_CLIENT_KEY, secret: process.env.TIKTOK_CLIENT_SECRET },
};

export const isNetwork = (n: string): n is Network => n === "instagram" || n === "tiktok";
export const configured = (n: Network) => !!(CFG[n].id && CFG[n].secret && process.env.POSTAI_SECRET);
export const redirectUri = (origin: string, n: Network) => `${origin}/api/social/${n}/callback`;

// ---------- cookie criptografado ----------
const key = () => createHash("sha256").update(process.env.POSTAI_SECRET ?? "").digest();

export function seal(a: Account) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(JSON.stringify(a), "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString("base64url");
}

export function unseal(v: string | undefined): Account | null {
  if (!v || !process.env.POSTAI_SECRET) return null;
  try {
    const b = Buffer.from(v, "base64url");
    const d = createDecipheriv("aes-256-gcm", key(), b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8"));
  } catch { return null; }
}

export const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: YEAR };

// ---------- login ----------
export function authorizeUrl(n: Network, origin: string, state: string) {
  const redirect = redirectUri(origin, n);
  if (n === "instagram") {
    const q = new URLSearchParams({ client_id: CFG.instagram.id!, redirect_uri: redirect, response_type: "code", scope: "instagram_business_basic,instagram_business_content_publish", state });
    return `https://www.instagram.com/oauth/authorize?${q}`;
  }
  const q = new URLSearchParams({ client_key: CFG.tiktok.id!, redirect_uri: redirect, response_type: "code", scope: "user.info.basic,video.publish,video.upload", state });
  return `https://www.tiktok.com/v2/auth/authorize/?${q}`;
}

async function json(res: Response) {
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.error) {
    const msg = j.error_description || j.error_message || j.error?.message || j.message || (typeof j.error === "string" ? j.error : "") || `HTTP ${res.status}`;
    throw new Error(String(msg));
  }
  return j;
}

/** Troca o código do login pela chave de acesso e lê nome e foto da conta. */
export async function exchange(n: Network, origin: string, code: string): Promise<Account> {
  const redirect = redirectUri(origin, n);
  if (n === "instagram") {
    const form = new URLSearchParams({ client_id: CFG.instagram.id!, client_secret: CFG.instagram.secret!, grant_type: "authorization_code", redirect_uri: redirect, code });
    const short = await json(await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body: form }));
    const s = Array.isArray(short.data) ? short.data[0] : short;
    // chave curta (1 h) → longa (60 dias)
    const long = await json(await fetch(`https://graph.instagram.com/access_token?${new URLSearchParams({ grant_type: "ig_exchange_token", client_secret: CFG.instagram.secret!, access_token: s.access_token })}`));
    const me = await json(await fetch(`https://graph.instagram.com/me?${new URLSearchParams({ fields: "user_id,username,profile_picture_url", access_token: long.access_token })}`));
    return { network: n, id: String(me.user_id ?? s.user_id), name: `@${me.username}`, avatar: me.profile_picture_url, token: long.access_token, expires: Date.now() + (long.expires_in ?? 5_184_000) * 1000 };
  }
  const form = new URLSearchParams({ client_key: CFG.tiktok.id!, client_secret: CFG.tiktok.secret!, code, grant_type: "authorization_code", redirect_uri: redirect });
  const t = await json(await fetch("https://open.tiktokapis.com/v2/oauth/token/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form }));
  const acc: Account = { network: n, id: t.open_id, name: "TikTok", token: t.access_token, expires: Date.now() + t.expires_in * 1000, refresh: t.refresh_token, refreshExpires: Date.now() + t.refresh_expires_in * 1000 };
  return { ...acc, ...(await tiktokProfile(acc.token)) };
}

async function tiktokProfile(token: string) {
  const r = await json(await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url", { headers: { Authorization: `Bearer ${token}` } }));
  const u = r.data?.user ?? {};
  return { name: u.display_name || "TikTok", avatar: u.avatar_url };
}

/** Renova a chave antes de vencer. Devolve null se a conta precisa ser conectada de novo. */
export async function refresh(a: Account): Promise<Account | null> {
  const now = Date.now();
  if (a.network === "instagram") {
    if (a.expires < now) return null;
    if (a.expires - now > 7 * 86_400_000) return a; // ainda tem mais de 7 dias
    try {
      const r = await json(await fetch(`https://graph.instagram.com/refresh_access_token?${new URLSearchParams({ grant_type: "ig_refresh_token", access_token: a.token })}`));
      return { ...a, token: r.access_token, expires: now + r.expires_in * 1000 };
    } catch { return a; }
  }
  if (a.expires - now > 10 * 60_000) return a;
  if (!a.refresh || (a.refreshExpires ?? 0) < now) return null;
  try {
    const form = new URLSearchParams({ client_key: CFG.tiktok.id!, client_secret: CFG.tiktok.secret!, grant_type: "refresh_token", refresh_token: a.refresh });
    const t = await json(await fetch("https://open.tiktokapis.com/v2/oauth/token/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form }));
    return { ...a, token: t.access_token, expires: now + t.expires_in * 1000, refresh: t.refresh_token, refreshExpires: now + t.refresh_expires_in * 1000 };
  } catch { return null; }
}
