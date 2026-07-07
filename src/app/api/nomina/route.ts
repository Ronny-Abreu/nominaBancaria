import { NextRequest, NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/session";
import { nominaCreateSchema } from "@/lib/validation/nominaSchema";
import { getUsuariosByIds } from "@/lib/firestore/empleados";
import { createNominaRun, filtrarEmpleadosNoPagados } from "@/lib/firestore/nominaRuns";
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

  const { periodo } = parsed.data;
  const candidates = await getUsuariosByIds(parsed.data.empleadoUids);
  const validos = candidates.filter((u) => u.rol === "empleado" && u.activo);

  if (validos.length === 0) {
    return NextResponse.json(
      { error: "Ningún empleado seleccionado es válido o está activo" },
      { status: 400 }
    );
  }

  // Idempotencia (AB-150): descartar empleados ya pagados en este período.
  const { pagables, omitidos } = await filtrarEmpleadosNoPagados(
    periodo,
    validos.map((u) => u.uid)
  );
  const pagablesSet = new Set(pagables);
  const empleados = validos.filter((u) => pagablesSet.has(u.uid));
  const omitidosSet = new Set(omitidos);
  const omitidosInfo = validos
    .filter((u) => omitidosSet.has(u.uid))
    .map((u) => ({ uid: u.uid, nombre: `${u.nombre} ${u.apellido}` }));

  if (empleados.length === 0) {
    return NextResponse.json(
      {
        error: `Todos los empleados seleccionados ya tienen un pago registrado para ${periodo}`,
        omitidos: omitidosInfo,
      },
      { status: 409 }
    );
  }

  const runId = await createNominaRun(periodo, session.uid, empleados);
  await logAudit({
    accion: "nomina.crear",
    ...actorFromSession(session),
    ip: getClientIp(req),
    entidad: "nominaRun",
    entidadId: runId,
    detalle: `Corrida de nómina ${periodo} con ${empleados.length} empleado(s)`,
  });

  if (omitidosInfo.length > 0) {
    await logAudit({
      accion: "pago.duplicado_bloqueado",
      ...actorFromSession(session),
      ip: getClientIp(req),
      entidad: "nominaRun",
      entidadId: runId,
      detalle: `Omitidos por pago duplicado en ${periodo}: ${omitidosInfo
        .map((o) => o.nombre)
        .join(", ")}`,
    });
  }

  return NextResponse.json({ runId, omitidos: omitidosInfo });
}
