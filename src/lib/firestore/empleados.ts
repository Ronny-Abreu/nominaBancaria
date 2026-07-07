import "server-only";
import { randomInt } from "crypto";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { Usuario } from "@/types/user";
import type { EmpleadoCreateInput, EmpleadoUpdateInput } from "@/lib/validation/empleadoSchema";

const TEMP_PASSWORD_CHARS = process.env.TEMP_PASSWORD_CHARS as string;

export function generateTempPassword(length = 12): string {
  let password = "";
  for (let i = 0; i < length; i++) {
    password += TEMP_PASSWORD_CHARS[randomInt(TEMP_PASSWORD_CHARS.length)];
  }
  return password;
}

export class EmailAlreadyExistsError extends Error {
  constructor() {
    super("Ya existe una cuenta con este correo electrónico");
    this.name = "EmailAlreadyExistsError";
  }
}

export class CedulaAlreadyExistsError extends Error {
  constructor() {
    super("La cédula ya está registrada");
    this.name = "CedulaAlreadyExistsError";
  }
}

/** True if any usuarios doc already has this cédula (uniqueness — AB-210). */
export async function cedulaEnUso(cedula: string): Promise<boolean> {
  const snap = await adminDb
    .collection("usuarios")
    .where("cedula", "==", cedula)
    .limit(1)
    .get();
  return !snap.empty;
}

export async function createEmpleado(
  input: EmpleadoCreateInput,
  createdBy: string
): Promise<{ uid: string; tempPassword: string; usuario: Usuario }> {
  const existing = await adminAuth
    .getUserByEmail(input.email)
    .catch(() => null);
  if (existing) throw new EmailAlreadyExistsError();

  if (await cedulaEnUso(input.cedula)) throw new CedulaAlreadyExistsError();

  const tempPassword = generateTempPassword();
  const rol = input.rol ?? "empleado";

  const authUser = await adminAuth.createUser({
    email: input.email,
    password: tempPassword,
    displayName: `${input.nombre} ${input.apellido}`,
  });

  const now = Date.now();
  const usuario: Usuario = {
    uid: authUser.uid,
    rol,
    nombre: input.nombre,
    apellido: input.apellido,
    email: input.email,
    gender: input.gender,
    cedula: input.cedula,
    puesto: input.puesto,
    salarioBruto: rol === "empleado" ? input.salarioBruto : 0,
    activo: true,
    createdAt: now,
    updatedAt: now,
    createdBy,
    mustChangePassword: true,
  };

  await adminDb.collection("usuarios").doc(authUser.uid).set(usuario);

  return { uid: authUser.uid, tempPassword, usuario };
}

export async function listEmpleados(
  activoFilter: "true" | "false" | "all" = "true"
): Promise<Usuario[]> {
  let query = adminDb.collection("usuarios").where("rol", "==", "empleado") as FirebaseFirestore.Query;
  if (activoFilter !== "all") {
    query = query.where("activo", "==", activoFilter === "true");
  }
  const snap = await query.get();
  return snap.docs.map((doc) => doc.data() as Usuario);
}

export async function getUsuarioById(uid: string): Promise<Usuario | null> {
  const snap = await adminDb.collection("usuarios").doc(uid).get();
  return snap.exists ? (snap.data() as Usuario) : null;
}

export async function listUsuariosByRol(roles: Usuario["rol"][]): Promise<Usuario[]> {
  const snap = await adminDb.collection("usuarios").where("rol", "in", roles).get();
  return snap.docs.map((doc) => doc.data() as Usuario);
}

export async function getUsuariosByIds(uids: string[]): Promise<Usuario[]> {
  if (uids.length === 0) return [];
  const refs = uids.map((uid) => adminDb.collection("usuarios").doc(uid));
  const snaps = await adminDb.getAll(...refs);
  return snaps.filter((s) => s.exists).map((s) => s.data() as Usuario);
}

export async function updateEmpleado(
  uid: string,
  input: EmpleadoUpdateInput
): Promise<Usuario> {
  const ref = adminDb.collection("usuarios").doc(uid);
  await ref.update({ ...input, updatedAt: Date.now() });
  const snap = await ref.get();
  return snap.data() as Usuario;
}

/**
 * Hard-deletes a user everywhere: the Firebase Auth account and the Firestore
 * usuarios/{uid} document. This is a permanent, admin-only operation, distinct
 * from the "baja lógica" (activo:false) soft-delete used by RRHH. The Auth
 * deletion is best-effort — if the auth user is already gone we still remove
 * the Firestore doc so no orphaned profile remains.
 */
export async function deleteUsuario(uid: string): Promise<void> {
  await adminAuth.deleteUser(uid).catch((err: { code?: string }) => {
    if (err?.code !== "auth/user-not-found") throw err;
  });
  await adminDb.collection("usuarios").doc(uid).delete();
}
