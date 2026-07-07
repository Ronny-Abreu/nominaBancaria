import { NextRequest, NextResponse } from "next/server";
import { logAudit } from "@/lib/firestore/auditLogs";
import { getClientIp } from "@/lib/http/clientIp";

/**
 * Registra en auditoría una solicitud de restablecimiento de contraseña.
 * El correo real lo envía Firebase Auth desde el cliente (sendPasswordResetEmail);
 * este endpoint solo deja traza y SIEMPRE responde de forma genérica para no
 * revelar si el correo existe (anti-enumeración, AB-52).
 */
export async function POST(req: NextRequest) {
  let email = "";
  try {
    const body = await req.json();
    if (typeof body?.email === "string") email = body.email;
  } catch {
    // cuerpo inválido — igual respondemos genérico
  }

  await logAudit({
    accion: "password.reset_solicitado",
    actorUid: null,
    actorNombre: null,
    actorRol: null,
    ip: getClientIp(req),
    entidad: "sesion",
    entidadId: email || null,
    detalle: `Solicitud de restablecimiento para ${email || "(sin correo)"}`,
  });

  return NextResponse.json({ ok: true });
}
