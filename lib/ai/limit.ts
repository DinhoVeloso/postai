// Limite simples por IP (por instância do servidor): protege a cota gratuita dos provedores.
const hits = new Map<string, number[]>();

export function rateLimited(req: Request, key: string, limit: number, windowMs = 60 * 60 * 1000) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const k = `${key}:${ip}`, now = Date.now();
  const recent = (hits.get(k) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) return true;
  hits.set(k, [...recent, now]);
  return false;
}
