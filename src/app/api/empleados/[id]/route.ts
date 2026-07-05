import { NextRequest, NextResponse } from "next/server";
import { requireSession, requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/session";
import { isRrhhOrAdmin } from "@/lib/auth/roles";
import { empleadoUpdateSchema } from "@/lib/validation/empleadoSchema";
import { getUsuarioById, updateEmpleado, deleteUsuario } from "@/lib/firestore/empleados";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const isSelf = session.uid === id;
  if (!isSelf && !isRrhhOrAdmin(session.usuario.rol)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const empleado = await getUsuarioById(id);
  if (!empleado) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return NextResponse.json({ empleado });
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    await requireRole(["admin", "rrhh"]);
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
  const parsed = empleadoUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await getUsuarioById(id);
  if (!existing) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const empleado = await updateEmpleado(id, parsed.data);
  return NextResponse.json({ empleado });
}

// Hard delete — admin only. Removes the Firebase Auth account and the Firestore
// document permanently. RRHH keeps only the soft-delete (PUT activo:false).
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  let session;
  try {
    session = await requireRole(["admin"]);
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
      { error: "No puedes eliminar tu propia cuenta" },
      { status: 400 }
    );
  }

  const existing = await getUsuarioById(id);
  if (!existing) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await deleteUsuario(id);
  return NextResponse.json({ ok: true });
}
