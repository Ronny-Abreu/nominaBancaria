import { NextResponse } from "next/server";
import {
  requireSession,
  UnauthorizedError,
  ForbiddenError,
  ProfileNotFoundError,
} from "@/lib/auth/session";

/**
 * Authoritative account-status check, backed by the same Admin SDK read path
 * used by (protected)/layout.tsx on every navigation. The client's real-time
 * forced-logout effect (AuthProvider) calls this before actually signing the
 * user out, because the client-side Firestore `onSnapshot` listener can
 * report a transient/racy "not found" or stale state right after a fresh
 * login — trusting it directly caused false positives ("cuenta eliminada" on
 * an active account). This endpoint is the single source of truth.
 */
export async function GET() {
  try {
    await requireSession();
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ProfileNotFoundError) {
      return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ ok: false, reason: "inactive" }, { status: 403 });
    }
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });
    }
    throw err;
  }
}
