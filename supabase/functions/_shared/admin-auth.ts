// Admin token: base64url(JSON{exp}) + "." + base64url(HMAC-SHA256(payload, ADMIN_PASSWORD))
// 8h lifetime. Stored client-side in sessionStorage.

const TOKEN_TTL_SECONDS = 8 * 60 * 60;

function b64u(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64uDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64u(new Uint8Array(sig));
}

export async function issueAdminToken(): Promise<string> {
  const secret = Deno.env.get("ADMIN_PASSWORD");
  if (!secret) throw new Error("ADMIN_PASSWORD not configured");
  const payload = b64u(new TextEncoder().encode(JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    nonce: crypto.randomUUID(),
  })));
  const sig = await hmac(payload, secret);
  return `${payload}.${sig}`;
}

export async function verifyAdminToken(token: string | null | undefined): Promise<boolean> {
  if (!token || typeof token !== "string") return false;
  const secret = Deno.env.get("ADMIN_PASSWORD");
  if (!secret) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = await hmac(payload, secret);
  if (expected !== sig) return false;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(b64uDecode(payload)));
    if (typeof parsed.exp !== "number") return false;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

export function adminAuthHeaderToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  return h.replace(/^Bearer\s+/i, "").trim() || null;
}
