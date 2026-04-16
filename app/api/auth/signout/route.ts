import { signOut } from "@/auth";
import { NextResponse } from "next/server";

/**
 * POST /api/auth/signout
 * Sign out and redirect to home. Used by the dashboard form instead of a Server Action
 * to avoid "Failed to find Server Action" errors when the deployment changes (action IDs change per build).
 */
export async function POST() {
  await signOut({ redirectTo: "/" });
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return NextResponse.redirect(new URL("/", base), { status: 302 });
}
