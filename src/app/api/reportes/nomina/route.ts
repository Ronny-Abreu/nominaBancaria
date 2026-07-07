import { NextRequest, NextResponse } from "next/server";
import { requireRole, UnauthorizedError, ForbiddenError } from "@/lib/auth/session";
import { getReporteNomina } from "@/lib/firestore/nominaRuns";
import { generateReportePdf } from "@/lib/reports/reportePdf";
import { generateReporteExcel } from "@/lib/reports/reporteExcel";

const PERIODO_RE = /^\d{4}-\d{2}$/;

export async function GET(req: NextRequest) {
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

  const params = req.nextUrl.searchParams;
  const periodo = params.get("periodo") ?? "";
  const formato = params.get("formato") ?? "pdf";

  if (!PERIODO_RE.test(periodo)) {
    return NextResponse.json({ error: "Período inválido (usa YYYY-MM)" }, { status: 400 });
  }
  if (formato !== "pdf" && formato !== "excel") {
    return NextResponse.json({ error: "Formato inválido (pdf|excel)" }, { status: 400 });
  }

  const filas = await getReporteNomina(periodo);
  if (filas.length === 0) {
    return NextResponse.json(
      { error: `No hay recibos enviados para el período ${periodo}` },
      { status: 404 }
    );
  }

  if (formato === "excel") {
    const buffer = await generateReporteExcel(periodo, filas);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="nomina-${periodo}.xlsx"`,
      },
    });
  }

  const buffer = await generateReportePdf(periodo, filas);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="nomina-${periodo}.pdf"`,
    },
  });
}
