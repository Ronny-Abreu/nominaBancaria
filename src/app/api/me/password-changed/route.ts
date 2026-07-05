import { NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";

export async function POST() {
  let session;
  try {
    session = await requireSession();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  await adminDb.collection("usuarios").doc(session.uid).update({
    mustChangePassword: false,
    updatedAt: Date.now(),
  });

  return NextResponse.json({ ok: true });
}
