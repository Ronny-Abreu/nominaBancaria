import { NextRequest, NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/session";
import {
  getNominaRun,
  getNominaItems,
  markItemEstado,
  incrementRunCounters,
  eliminarMarcadorPago,
} from "@/lib/firestore/nominaRuns";
import { findBouncedRecipients } from "@/lib/payroll/bounceCheck";
import { logAudit, actorFromSession } from "@/lib/firestore/auditLogs";
import { getClientIp } from "@/lib/http/clientIp";

export const maxDuration = 60;

interface RouteParams {
  params: Promise<{ runId: string }>;
}

/**
 * Verifica rebotes del "Mail Delivery Subsystem" para esta corrida. Cualquier
 * empleado marcado como "enviado" cuyo correo haya rebotado de forma permanente
 * se revierte a "error" y se le quita el marcador de pago (deja de contarse
 * como pagado). Debe ejecutarse unos minutos después del envío, ya que Gmail
 * rebota de forma asíncrona.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { runId } = await params;

  let session;
  try {
    session = await requireRole(["admin", "rrhh"]);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    throw err;
  }

  const run = await getNominaRun(runId);
  if (!run) {
    return NextResponse.json({ error: "Proceso de nómina no encontrado" }, { status: 404 });
  }

  const { configured, bounced } = await findBouncedRecipients(run.createdAt);

  if (!configured) {
    return NextResponse.json({
      ok: true,
      configured: false,
      revertidos: [],
      mensaje: "La verificación por IMAP no está configurada en el servidor.",
    });
  }

  const items = await getNominaItems(runId);
  const revertidos: { empleadoUid: string; nombre: string; email: string }[] = [];

  for (const item of items) {
    if (item.estado !== "enviado") continue;
    if (!bounced.has(item.email.toLowerCase())) continue;

    await markItemEstado(runId, item.empleadoUid, "error", {
      errorMensaje: "Correo rebotado: la dirección no existe (Mail Delivery Subsystem) por lo que no se pudo procesar el pago",
      emailEnviadoAt: null,
    });
    await eliminarMarcadorPago(run.periodo, item.empleadoUid);
    await incrementRunCounters(runId, { totalExitosos: -1, totalFallidos: 1 });
    revertidos.push({ empleadoUid: item.empleadoUid, nombre: item.nombre, email: item.email });
  }

  if (revertidos.length > 0) {
    await logAudit({
      accion: "pago.rebotado",
      ...actorFromSession(session),
      ip: getClientIp(req),
      entidad: "nominaRun",
      entidadId: runId,
      detalle: `Rebotes revertidos en ${run.periodo}: ${revertidos
        .map((r) => `${r.nombre} (${r.email})`)
        .join(", ")}`,
    });
  }

  return NextResponse.json({ ok: true, configured: true, revertidos });
}
