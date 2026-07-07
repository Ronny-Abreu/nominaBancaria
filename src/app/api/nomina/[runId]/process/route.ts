import { NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/session";
import { asyncPool } from "@/lib/payroll/asyncPool";
import { generatePayslipPdf } from "@/lib/payroll/pdf";
import { sendPayslipEmail } from "@/lib/payroll/mailer";
import {
  getNominaRun,
  getNominaItems,
  markItemEstado,
  incrementRunCounters,
  markRunProcesando,
  finalizeRun,
  marcarPagoRealizado,
} from "@/lib/firestore/nominaRuns";
import { logAudit, actorFromSession } from "@/lib/firestore/auditLogs";
import { getClientIp } from "@/lib/http/clientIp";
import type { NominaItem } from "@/types/nomina";

export const maxDuration = 60;

interface RouteParams {
  params: Promise<{ runId: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
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

  const items = await getNominaItems(runId);
  const pending = items.filter((item) => item.estado === "pendiente");

  if (pending.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  await markRunProcesando(runId);

  const concurrency = Number(process.env.PAYROLL_BATCH_CONCURRENCY ?? 2);
  await asyncPool(concurrency, pending, (item) =>
    processOneEmployeePayroll(runId, run.periodo, item)
  );

  await finalizeRun(runId);

  const finalized = await getNominaRun(runId);
  await logAudit({
    accion: "nomina.finalizar",
    ...actorFromSession(session),
    ip: getClientIp(req),
    entidad: "nominaRun",
    entidadId: runId,
    detalle: `Nómina ${run.periodo} finalizada: ${finalized?.totalExitosos ?? 0} exitoso(s), ${finalized?.totalFallidos ?? 0} fallido(s)`,
  });

  return NextResponse.json({ ok: true, processed: pending.length });
}

async function processOneEmployeePayroll(
  runId: string,
  periodo: string,
  item: NominaItem
): Promise<void> {
  await markItemEstado(runId, item.empleadoUid, "procesando");

  try {
    const pdfBuffer = await generatePayslipPdf({
      empleadoNombre: item.nombre,
      periodo,
      salarioBruto: item.salarioBruto,
      deducciones: item.deducciones,
      salarioNeto: item.salarioNeto,
      fechaPago: new Date().toLocaleDateString("es-DO"),
    });

    await sendPayslipEmail({
      to: item.email,
      empleadoNombre: item.nombre,
      periodo,
      pdfBuffer,
    });

    const now = Date.now();
    await markItemEstado(runId, item.empleadoUid, "enviado", {
      pdfGeneradoAt: now,
      emailEnviadoAt: now,
    });
    // Marca de idempotencia: este empleado ya quedó pagado para el período.
    await marcarPagoRealizado(periodo, item.empleadoUid, runId);
    await incrementRunCounters(runId, { totalProcesados: 1, totalExitosos: 1 });
  } catch (err) {
    await markItemEstado(runId, item.empleadoUid, "error", {
      errorMensaje: err instanceof Error ? err.message : "Error desconocido",
      intentos: item.intentos + 1,
    });
    await incrementRunCounters(runId, { totalProcesados: 1, totalFallidos: 1 });
  }
}
