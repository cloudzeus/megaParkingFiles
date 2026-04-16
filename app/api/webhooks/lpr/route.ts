import { NextResponse } from "next/server";

/**
 * Webhook endpoint for LPR (or external service).
 * POST /api/webhooks/lpr
 * Returns 200 so callers stop receiving 404. Add verification or processing as needed.
 */
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    let _body: unknown = null;
    if (contentType.includes("application/json")) {
      _body = await req.json().catch(() => null);
    } else if (contentType.includes("form") || contentType.includes("multipart")) {
      _body = Object.fromEntries((await req.formData()).entries());
    } else {
      const text = await req.text();
      if (text.length > 0) _body = text;
    }
    // Optional: validate webhook secret, persist event, etc.
    return NextResponse.json({ received: true }, { status: 200 });
  } catch {
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
