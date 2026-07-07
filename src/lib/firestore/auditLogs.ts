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

// Cap de documentos a traer cuando se filtra por acción y se ordena en memoria.
const ACCION_SCAN_CAP = 1000;

export async function listAuditLogs({
  limit = 50,
  cursorTimestamp,
  accion,
}: ListAuditParams): Promise<AuditLog[]> {
  const col = adminDb.collection(COLLECTION);

  if (accion) {
    const snap = await col.where("accion", "==", accion).limit(ACCION_SCAN_CAP).get();
    let rows = snap.docs
      .map((d) => d.data() as AuditLog)
      .sort((a, b) => b.timestamp - a.timestamp);
    if (cursorTimestamp) rows = rows.filter((r) => r.timestamp < cursorTimestamp);
    return rows.slice(0, limit);
  }

  let query = col.orderBy("timestamp", "desc") as FirebaseFirestore.Query;
  if (cursorTimestamp) query = query.startAfter(cursorTimestamp);
  const snap = await query.limit(limit).get();
  return snap.docs.map((d) => d.data() as AuditLog);
}
