import { NextRequest, NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/roles";
import { getUsuarioById, resetEmpleadoPassword } from "@/lib/firestore/empleados";
import { logAudit, actorFromSession } from "@/lib/firestore/auditLogs";
import { getClientIp } from "@/lib/http/clientIp";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Asigna una nueva contraseña temporal a un usuario y lo obliga a cambiarla en
 * el próximo inicio de sesión (mustChangePassword). Solo admin/RRHH; RRHH no
 * puede resetear cuentas admin/RRHH. La contraseña temporal se devuelve una
 * sola vez para que quien la asigna la comunique.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

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

  if (session.uid === id) {
    return NextResponse.json(
      { error: "No puedes resetear tu propia contraseña desde aquí" },
      { status: 400 }
    );
  }

  const target = await getUsuarioById(id);
  if (!target) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  // RRHH solo puede resetear empleados; las cuentas admin/RRHH son de admin.
  if (target.rol !== "empleado" && !isAdmin(session.usuario.rol)) {
    return NextResponse.json(
      { error: "No autorizado para resetear esta cuenta" },
      { status: 403 }
    );
  }

  const { tempPassword } = await resetEmpleadoPassword(id);

  await logAudit({
    accion: "empleado.reset_password",
    ...actorFromSession(session),
    ip: getClientIp(req),
    entidad: "empleado",
    entidadId: id,
    detalle: `Reseteo de contraseña de ${target.nombre} ${target.apellido} (${target.email})`,
  });

  return NextResponse.json({ ok: true, tempPassword });
}
