import { NextRequest, NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/session";
import { listAuditLogs } from "@/lib/firestore/auditLogs";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["admin"]);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    throw err;
  }

  const params = req.nextUrl.searchParams;
  const accion = params.get("accion") || undefined;
  const cursor = params.get("cursor");
  const cursorTimestamp = cursor ? Number(cursor) : undefined;

  const logs = await listAuditLogs({ limit: 50, accion, cursorTimestamp });
  const nextCursor = logs.length === 50 ? logs[logs.length - 1].timestamp : null;

  return NextResponse.json({ logs, nextCursor });
}
