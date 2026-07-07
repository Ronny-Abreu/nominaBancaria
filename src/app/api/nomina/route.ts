import { NextRequest, NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/session";
import { nominaCreateSchema } from "@/lib/validation/nominaSchema";
import { getUsuariosByIds } from "@/lib/firestore/empleados";
import { createNominaRun } from "@/lib/firestore/nominaRuns";
import { logAudit, actorFromSession } from "@/lib/firestore/auditLogs";
import { getClientIp } from "@/lib/http/clientIp";

export async function POST(req: NextRequest) {
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

  const body = await req.json();
  const parsed = nominaCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const candidates = await getUsuariosByIds(parsed.data.empleadoUids);
  const empleados = candidates.filter((u) => u.rol === "empleado" && u.activo);

  if (empleados.length === 0) {
    return NextResponse.json(
      { error: "Ningún empleado seleccionado es válido o está activo" },
      { status: 400 }
    );
  }

  const runId = await createNominaRun(parsed.data.periodo, session.uid, empleados);
  await logAudit({
    accion: "nomina.crear",
    ...actorFromSession(session),
    ip: getClientIp(req),
    entidad: "nominaRun",
    entidadId: runId,
    detalle: `Corrida de nómina ${parsed.data.periodo} con ${empleados.length} empleado(s)`,
  });
  return NextResponse.json({ runId });
}
