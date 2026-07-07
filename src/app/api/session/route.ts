import { NextRequest, NextResponse } from "next/server";
import { createSession, getSessionUid, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { logAudit, resolveActor, resolveActorFromIdToken } from "@/lib/firestore/auditLogs";
import { getClientIp } from "@/lib/http/clientIp";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "idToken requerido" }, { status: 400 });
    }

    let sessionCookie: string;
    try {
      sessionCookie = await createSession(idToken);
    } catch (err: unknown) {
      console.error("Firebase Admin Error interno (createSession):", err);
      return NextResponse.json(
        { error: "Token inválido o Firebase Admin falló", details: errorMessage(err) },
        { status: 500 }
      );
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 5,
    });

    const actor = await resolveActorFromIdToken(idToken);
    await logAudit({
      accion: "login",
      ...actor,
      ip: getClientIp(req),
      entidad: "sesion",
      entidadId: actor.actorUid,
      detalle: "Inicio de sesión exitoso",
    });
    return res;
  } catch (globalError: unknown) {
    console.error("Error Global en /api/session:", globalError);
    return NextResponse.json(
      { error: "Error interno del servidor", details: errorMessage(globalError) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const uid = await getSessionUid();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });

  if (uid) {
    const actor = await resolveActor(uid);
    await logAudit({
      accion: "logout",
      ...actor,
      ip: getClientIp(req),
      entidad: "sesion",
      entidadId: uid,
      detalle: "Cierre de sesión",
    });
  }
  return res;
}
