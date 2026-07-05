import { NextRequest, NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/session";
import { empleadoCreateSchema } from "@/lib/validation/empleadoSchema";
import { createEmpleado, listUsuariosByRol, EmailAlreadyExistsError } from "@/lib/firestore/empleados";

export async function GET() {
  try {
    await requireRole(["admin"]);
  } catch (err) {
    return errorResponse(err);
  }

  const usuarios = await listUsuariosByRol(["admin", "rrhh"]);
  return NextResponse.json({ usuarios });
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireRole(["admin"]);
  } catch (err) {
    return errorResponse(err);
  }

  const body = await req.json();
  const parsed = empleadoCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.rol === "empleado" || !parsed.data.rol) {
    return NextResponse.json(
      { error: "Usa /empleados para crear cuentas de tipo empleado" },
      { status: 400 }
    );
  }

  try {
    const { uid, tempPassword, usuario } = await createEmpleado(parsed.data, session.uid);
    return NextResponse.json({ uid, tempPassword, usuario }, { status: 201 });
  } catch (err) {
    if (err instanceof EmailAlreadyExistsError) {
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
