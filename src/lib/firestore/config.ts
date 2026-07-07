import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { DEFAULT_PARAMETROS_FISCALES } from "@/lib/payroll/deductions";
import { logAudit } from "@/lib/firestore/auditLogs";
import type { ParametrosFiscales } from "@/types/config";
import type { SessionUser } from "@/lib/auth/session";

const DOC_PATH = { collection: "configuracion", doc: "parametrosFiscales" };

function ref() {
  return adminDb.collection(DOC_PATH.collection).doc(DOC_PATH.doc);
}

/**
 * Returns the stored fiscal parameters, seeding the document with the defaults
 * on first read so the admin panel always has a concrete row to edit.
 */
export async function getParametrosFiscales(): Promise<ParametrosFiscales> {
  const snap = await ref().get();
  if (snap.exists) return snap.data() as ParametrosFiscales;

  const seeded: ParametrosFiscales = { ...DEFAULT_PARAMETROS_FISCALES, updatedAt: Date.now() };
  await ref().set(seeded);
  return seeded;
}

export interface ParametrosFiscalesInput {
  afpRate: number;
  arsRate: number;
  isrBrackets: ParametrosFiscales["isrBrackets"];
}

export async function updateParametrosFiscales(
  input: ParametrosFiscalesInput,
  actor: SessionUser
): Promise<ParametrosFiscales> {
  const value: ParametrosFiscales = {
    afpRate: input.afpRate,
    arsRate: input.arsRate,
    isrBrackets: input.isrBrackets,
    updatedAt: Date.now(),
    updatedBy: actor.uid,
  };
  await ref().set(value);

  await logAudit({
    accion: "config.actualizar",
    actorUid: actor.uid,
    actorNombre: `${actor.usuario.nombre} ${actor.usuario.apellido}`,
    actorRol: actor.usuario.rol,
    ip: null,
    entidad: "configuracion",
    entidadId: DOC_PATH.doc,
    detalle: `AFP ${(input.afpRate * 100).toFixed(2)}%, ARS ${(input.arsRate * 100).toFixed(2)}%, ${input.isrBrackets.length} tramos ISR`,
  });

  return value;
}
