import "server-only";
import { randomUUID } from "crypto";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { AuditLog, AuditLogInput } from "@/types/audit";
import type { Usuario } from "@/types/user";
import type { SessionUser } from "@/lib/auth/session";

/** Maps an authenticated session to the audit actor fields. */
export function actorFromSession(session: SessionUser) {
  return {
    actorUid: session.uid,
    actorNombre: `${session.usuario.nombre} ${session.usuario.apellido}`,
    actorRol: session.usuario.rol,
  };
}

const COLLECTION = "auditLogs";

/**
 * Writes one append-only audit entry. Deliberately resilient: it swallows all
 * errors so a logging failure can NEVER break the critical operation being
 * audited (e.g. login). Callers can `await logAudit(...)` without a try/catch.
 *
 * We `await` (rather than fire-and-forget) because a Vercel serverless function
 * may be frozen right after the response is sent, dropping unfinished work — so
 * a truly async background write would often be lost. The write is a single
 * lightweight document, so the added latency is negligible.
 */
export async function logAudit(entry: AuditLogInput): Promise<void> {
  try {
    const id = randomUUID();
    const doc: AuditLog = { id, timestamp: Date.now(), ...entry };
    await adminDb.collection(COLLECTION).doc(id).set(doc);
  } catch (err) {
    console.error("logAudit falló (no bloquea la operación):", err);
  }
}

/** Loads a user's display name + role for the audit actor fields (best-effort). */
export async function resolveActor(
  uid: string
): Promise<{ actorUid: string; actorNombre: string | null; actorRol: string | null }> {
  try {
    const snap = await adminDb.collection("usuarios").doc(uid).get();
    if (snap.exists) {
      const u = snap.data() as Usuario;
      return { actorUid: uid, actorNombre: `${u.nombre} ${u.apellido}`, actorRol: u.rol };
    }
  } catch {
    // ignore — auditing is best-effort
  }
  return { actorUid: uid, actorNombre: null, actorRol: null };
}

/**
 * Resolves actor info from a Firebase ID token (used at login, before a session
 * exists). Verifies the token to get the uid, then loads the profile.
 */
export async function resolveActorFromIdToken(
  idToken: string
): Promise<{ actorUid: string | null; actorNombre: string | null; actorRol: string | null }> {
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    return resolveActor(decoded.uid);
  } catch {
    return { actorUid: null, actorNombre: null, actorRol: null };
  }
}

export interface ListAuditParams {
  limit?: number;
  cursorTimestamp?: number;
  accion?: string;
}

export async function listAuditLogs({
  limit = 50,
  cursorTimestamp,
  accion,
}: ListAuditParams): Promise<AuditLog[]> {
  let query = adminDb
    .collection(COLLECTION)
    .orderBy("timestamp", "desc") as FirebaseFirestore.Query;

  if (accion) query = query.where("accion", "==", accion);
  if (cursorTimestamp) query = query.startAfter(cursorTimestamp);

  const snap = await query.limit(limit).get();
  return snap.docs.map((d) => d.data() as AuditLog);
}
