/**
 * Best-effort client IP extraction for audit logging. On Vercel the real
 * client IP arrives in `x-forwarded-for` (first entry of the comma list);
 * `x-real-ip` is a fallback. Returns null when unavailable — auditing never
 * depends on having an IP.
 */
export function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip");
}
