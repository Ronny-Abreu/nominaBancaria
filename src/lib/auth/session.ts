import "server-only";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import type { Usuario } from "@/types/user";

export { SESSION_COOKIE_NAME };
const SESSION_EXPIRES_IN_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

export class UnauthorizedError extends Error {
  constructor(message = "No autenticado") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * La cookie de sesión existe pero fue revocada (p. ej. un admin reseteó la
 * contraseña y se llamó a revokeRefreshTokens). Es subclase de
 * UnauthorizedError para que todas las rutas API la traten como 401 sin
 * cambios, mientras el layout puede detectarla específicamente y mostrar el
 * aviso de "actividad inusual".
 */
export class SessionRevokedError extends UnauthorizedError {
  constructor() {
    super("Sesión revocada");
    this.name = "SessionRevokedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "No autorizado") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class ProfileNotFoundError extends Error {
  constructor() {
    super("Perfil no encontrado en Firestore");
    this.name = "ProfileNotFoundError";
  }
}

export async function createSession(idToken: string): Promise<string> {
  return adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_EXPIRES_IN_MS });
}

export async function getSessionUid(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decoded.uid;
  } catch (err: unknown) {
    // Firebase lanza este código cuando el token fue revocado (p. ej. reset de
    // contraseña con revokeRefreshTokens). Lo propagamos para que el layout
    // pueda limpiar la cookie y mostrar el aviso, rompiendo el redirect loop.
    const code = (err as { code?: string })?.code;
    if (code === "auth/session-cookie-revoked") {
      throw new SessionRevokedError();
    }
    return null;
  }
}

export interface SessionUser {
  uid: string;
  usuario: Usuario;
}

/**
 * Verifies the session cookie and loads the caller's Firestore profile.
 * Throws UnauthorizedError if there's no valid session, or if the account
 * has been deactivated in the meantime.
 * Throws SessionRevokedError if the token was revoked (password reset).
 */
export async function requireSession(): Promise<SessionUser> {
  const uid = await getSessionUid(); // puede lanzar SessionRevokedError
  if (!uid) throw new UnauthorizedError();

  const snap = await adminDb.collection("usuarios").doc(uid).get();
  if (!snap.exists) throw new ProfileNotFoundError();

  const usuario = snap.data() as Usuario;
  if (!usuario.activo) throw new ForbiddenError("Cuenta desactivada");

  return { uid, usuario };
}

export async function requireRole(roles: Usuario["rol"][]): Promise<SessionUser> {
  const session = await requireSession();
  if (!roles.includes(session.usuario.rol)) {
    throw new ForbiddenError();
  }
  return session;
}
