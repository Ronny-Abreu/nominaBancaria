import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { ReporteFila } from "@/lib/firestore/nominaRuns";

const currency = new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" });

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#13231d" },
  eyebrow: { fontSize: 8, letterSpacing: 2, color: "#4b5a54", marginBottom: 4 },
  title: { fontSize: 18, marginBottom: 2, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 10, color: "#4b5a54", marginBottom: 16 },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#13231d",
    paddingBottom: 4,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#dad4c2",
  },
  totalRow: { flexDirection: "row", paddingVertical: 6, marginTop: 2 },
  cNombre: { width: "26%" },
  cNum: { width: "14.8%", textAlign: "right" },
  hCell: { fontFamily: "Helvetica-Bold", fontSize: 8 },
  bold: { fontFamily: "Helvetica-Bold" },
  footer: { marginTop: 24, fontSize: 7, color: "#4b5a54" },
});

interface ReportePdfProps {
  periodo: string;
  filas: ReporteFila[];
}

function ReporteDocument({ periodo, filas }: ReportePdfProps) {
  const tot = filas.reduce(
    (acc, f) => ({
      bruto: acc.bruto + f.salarioBruto,
      afp: acc.afp + f.afp,
      ars: acc.ars + f.ars,
      isr: acc.isr + f.isr,
      neto: acc.neto + f.salarioNeto,
    }),
    { bruto: 0, afp: 0, ars: 0, isr: 0, neto: 0 }
  );

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.eyebrow}>REPORTE DE NÓMINA Y RETENCIONES · SIMULACIÓN</Text>
        <Text style={styles.title}>Nómina Bancaria</Text>
        <Text style={styles.subtitle}>
          Período {periodo} · {filas.length} empleado(s)
        </Text>

        <View style={styles.headerRow}>
          <Text style={[styles.cNombre, styles.hCell]}>Empleado</Text>
          <Text style={[styles.cNum, styles.hCell]}>Bruto</Text>
          <Text style={[styles.cNum, styles.hCell]}>AFP</Text>
          <Text style={[styles.cNum, styles.hCell]}>ARS</Text>
          <Text style={[styles.cNum, styles.hCell]}>ISR</Text>
          <Text style={[styles.cNum, styles.hCell]}>Neto</Text>
        </View>

        {filas.map((f) => (
          <View style={styles.row} key={f.empleadoUid}>
            <Text style={styles.cNombre}>{f.nombre}</Text>
            <Text style={styles.cNum}>{currency.format(f.salarioBruto)}</Text>
            <Text style={styles.cNum}>{currency.format(f.afp)}</Text>
            <Text style={styles.cNum}>{currency.format(f.ars)}</Text>
            <Text style={styles.cNum}>{currency.format(f.isr)}</Text>
            <Text style={styles.cNum}>{currency.format(f.salarioNeto)}</Text>
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text style={[styles.cNombre, styles.bold]}>TOTALES</Text>
          <Text style={[styles.cNum, styles.bold]}>{currency.format(tot.bruto)}</Text>
          <Text style={[styles.cNum, styles.bold]}>{currency.format(tot.afp)}</Text>
          <Text style={[styles.cNum, styles.bold]}>{currency.format(tot.ars)}</Text>
          <Text style={[styles.cNum, styles.bold]}>{currency.format(tot.isr)}</Text>
          <Text style={[styles.cNum, styles.bold]}>{currency.format(tot.neto)}</Text>
        </View>

        <Text style={styles.footer}>
          Documento generado automáticamente con fines de simulación académica. Los
          montos de deducciones legales (AFP, ARS, ISR) son aproximados y no
          constituyen asesoría fiscal.
        </Text>
      </Page>
    </Document>
  );
}

export async function generateReportePdf(periodo: string, filas: ReporteFila[]): Promise<Buffer> {
  return renderToBuffer(<ReporteDocument periodo={periodo} filas={filas} />);
}
