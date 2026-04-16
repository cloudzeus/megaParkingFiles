import { edgeAuth } from "@/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CLEAR_SESSION_PARAM = "clear_session";

const withAuth = edgeAuth((_req) => {
  // _req.auth is set by Auth.js; authorized callback controls redirects
  return;
});

/** Build cookie-clear header (same Path/Domain/Secure so browser accepts clear). */
function clearSessionCookieHeaders(request: NextRequest): [string, string] {
  const host = request.nextUrl.hostname;
  const isSecure = request.nextUrl.protocol === "https:";
  const base = "Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax";
  const domain = host ? `; Domain=${host}` : "";
  const secure = isSecure ? "; Secure" : "";
  return [
    `authjs.session-token=; ${base}${domain}${secure}`,
    `__Secure-authjs.session-token=; ${base}${domain}; Secure`,
  ];
}

/** Redirect to /login with session cookies cleared (no auth check = no loop). */
function clearSessionAndRedirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.delete(CLEAR_SESSION_PARAM);
  const res = NextResponse.redirect(loginUrl);
  const [cookie1, cookie2] = clearSessionCookieHeaders(request);
  res.headers.append("Set-Cookie", cookie1);
  res.headers.append("Set-Cookie", cookie2);
  return res;
}

export default async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Never run auth on /login → no redirect loop. Login page handles session via auth().
  if (pathname === "/login") {
    if (searchParams.get(CLEAR_SESSION_PARAM) === "1") {
      return clearSessionAndRedirectToLogin(request);
    }
    return NextResponse.next();
  }

  try {
    return await withAuth(request as never, {} as never);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string })?.code;
    if (
      code === "JWTSessionError" ||
      message.includes("decryption") ||
      message.includes("matching decryption secret")
    ) {
      const clearUrl = new URL("/login", request.url);
      clearUrl.searchParams.set(CLEAR_SESSION_PARAM, "1");
      return NextResponse.redirect(clearUrl);
    }
    throw err;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
