import { NextRequest, NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/session";
import { parametrosFiscalesSchema } from "@/lib/validation/configSchema";
import { getParametrosFiscales, updateParametrosFiscales } from "@/lib/firestore/config";

function authError(err: unknown) {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  throw err;
}

export async function GET() {
  try {
    await requireRole(["admin"]);
  } catch (err) {
    return authError(err);
  }

  const parametros = await getParametrosFiscales();
  return NextResponse.json({ parametros });
}

export async function PUT(req: NextRequest) {
  let session;
  try {
    session = await requireRole(["admin"]);
  } catch (err) {
    return authError(err);
  }

  const body = await req.json();
  const parsed = parametrosFiscalesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const parametros = await updateParametrosFiscales(parsed.data, session);
  return NextResponse.json({ parametros });
}
