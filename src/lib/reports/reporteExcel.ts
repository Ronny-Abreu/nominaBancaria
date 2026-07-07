import "server-only";
import ExcelJS from "exceljs";
import type { ReporteFila } from "@/lib/firestore/nominaRuns";

const MONEY = '"RD$"#,##0.00';

export async function generateReporteExcel(
  periodo: string,
  filas: ReporteFila[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Nómina Bancaria";
  wb.created = new Date();

  const ws = wb.addWorksheet(`Nómina ${periodo}`);

  ws.mergeCells("A1:F1");
  ws.getCell("A1").value = `Reporte de nómina y retenciones — Período ${periodo}`;
  ws.getCell("A1").font = { bold: true, size: 14 };

  const headerRow = ws.addRow(["Empleado", "Correo", "Bruto", "AFP", "ARS", "ISR", "Neto"]);
  headerRow.font = { bold: true };

  ws.columns = [
    { key: "nombre", width: 28 },
    { key: "email", width: 30 },
    { key: "bruto", width: 15 },
    { key: "afp", width: 13 },
    { key: "ars", width: 13 },
    { key: "isr", width: 13 },
    { key: "neto", width: 15 },
  ];

  const tot = { bruto: 0, afp: 0, ars: 0, isr: 0, neto: 0 };
  for (const f of filas) {
    ws.addRow([f.nombre, f.email, f.salarioBruto, f.afp, f.ars, f.isr, f.salarioNeto]);
    tot.bruto += f.salarioBruto;
    tot.afp += f.afp;
    tot.ars += f.ars;
    tot.isr += f.isr;
    tot.neto += f.salarioNeto;
  }

  const totalRow = ws.addRow(["TOTALES", "", tot.bruto, tot.afp, tot.ars, tot.isr, tot.neto]);
  totalRow.font = { bold: true };

  // Formato de moneda para las columnas numéricas (C..G).
  ["C", "D", "E", "F", "G"].forEach((col) => {
    ws.getColumn(col).numFmt = MONEY;
  });

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
