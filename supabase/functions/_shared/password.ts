// Tiny salted-SHA256 password hashing for squad leaders.
// Format: "s2:<saltHex>:<hashHex>"

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function sha256(bytes: Uint8Array): Promise<ArrayBuffer> {
  return await crypto.subtle.digest("SHA-256", bytes);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const pw = enc.encode(password);
  const combined = new Uint8Array(salt.length + pw.length);
  combined.set(salt, 0);
  combined.set(pw, salt.length);
  const digest = await sha256(combined);
  return `s2:${toHex(salt.buffer)}:${toHex(digest)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored?.startsWith("s2:")) return false;
  const [, saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = fromHex(saltHex);
  const pw = new TextEncoder().encode(password);
  const combined = new Uint8Array(salt.length + pw.length);
  combined.set(salt, 0);
  combined.set(pw, salt.length);
  const digest = await sha256(combined);
  const got = toHex(digest);
  // constant-time compare
  if (got.length !== hashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ hashHex.charCodeAt(i);
  return diff === 0;
}
