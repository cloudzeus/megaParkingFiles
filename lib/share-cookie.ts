import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "file-share-cookie-secret";
const COOKIE_MAX_AGE = 600; // 10 minutes

function sign(shareId: number): string {
  const expiry = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE;
  const payload = `${shareId}:${expiry}`;
  const sig = createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}:${sig}`;
}

export function createShareCookie(shareId: number): { name: string; value: string; options: { path: string; httpOnly: boolean; secure: boolean; sameSite: "lax"; maxAge: number } } {
  const value = sign(shareId);
  return {
    name: `share_${shareId}`,
    value,
    options: {
      path: "/api/shares",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
    },
  };
}

export function verifyShareCookie(shareId: number, cookieValue: string | null): boolean {
  if (!cookieValue) return false;
  try {
    cookieValue = decodeURIComponent(cookieValue.replace(/^"|"$/g, ""));
  } catch {
    return false;
  }
  const parts = cookieValue.split(":");
  if (parts.length !== 3) return false;
  const [idStr, expiryStr, sig] = parts;
  const id = Number(idStr);
  const expiry = Number(expiryStr);
  if (Number.isNaN(id) || id !== shareId || Number.isNaN(expiry)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (now > expiry) return false;
  const payload = `${id}:${expiry}`;
  const expected = createHmac("sha256", SECRET).update(payload).digest("base64url");
  try {
    const sigBuf = Buffer.from(sig, "base64url");
    const expectedBuf = Buffer.from(expected, "base64url");
    if (sigBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(sigBuf, expectedBuf);
  } catch {
    return false;
  }
}
