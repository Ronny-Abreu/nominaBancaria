import { NextRequest, NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/session";
import { canAssignRol } from "@/lib/auth/roles";
import { empleadoCreateSchema } from "@/lib/validation/empleadoSchema";
import {
  createEmpleado,
  listEmpleados,
  EmailAlreadyExistsError,
  CedulaAlreadyExistsError,
} from "@/lib/firestore/empleados";
import { logAudit, actorFromSession } from "@/lib/firestore/auditLogs";
import { getClientIp } from "@/lib/http/clientIp";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["admin", "rrhh"]);
  } catch (err) {
    return errorResponse(err);
  }

  const activo = req.nextUrl.searchParams.get("activo") as
    | "true"
    | "false"
    | "all"
    | null;
  const empleados = await listEmpleados(activo ?? "true");
  return NextResponse.json({ empleados });
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireRole(["admin", "rrhh"]);
  } catch (err) {
    return errorResponse(err);
  }

  const body = await req.json();
  const parsed = empleadoCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const targetRol = parsed.data.rol ?? "empleado";
  if (!canAssignRol(session.usuario.rol, targetRol)) {
    return NextResponse.json(
      { error: "No puedes asignar ese rol" },
      { status: 403 }
    );
  }

  try {
    const { uid, tempPassword, usuario } = await createEmpleado(
      parsed.data,
      session.uid
    );
    await logAudit({
      accion: "empleado.crear",
      ...actorFromSession(session),
      ip: getClientIp(req),
      entidad: "empleado",
      entidadId: uid,
      detalle: `Alta de ${usuario.nombre} ${usuario.apellido} (${usuario.email}), rol ${usuario.rol}`,
    });
    return NextResponse.json({ uid, tempPassword, empleado: usuario }, { status: 201 });
  } catch (err) {
    if (err instanceof EmailAlreadyExistsError || err instanceof CedulaAlreadyExistsError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}

function errorResponse(err: unknown) {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  throw err;
}
