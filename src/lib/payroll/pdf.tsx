import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { Deducciones } from "@/types/nomina";

export interface PayslipData {
  empleadoNombre: string;
  periodo: string;
  salarioBruto: number;
  deducciones: Deducciones;
  salarioNeto: number;
  fechaPago: string;
}

const currency = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
});

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica", color: "#13231d" },
  eyebrow: { fontSize: 9, letterSpacing: 2, color: "#4b5a54", marginBottom: 4 },
  title: { fontSize: 20, marginBottom: 20, fontFamily: "Helvetica-Bold" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  metaLabel: { fontSize: 9, color: "#4b5a54" },
  metaValue: { fontSize: 12, marginTop: 2 },
  table: { borderTopWidth: 1, borderTopColor: "#dad4c2", marginTop: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#dad4c2",
  },
  rowLabel: { fontSize: 11 },
  rowValue: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, marginTop: 4 },
  totalLabel: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  totalValue: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  footer: { marginTop: 40, fontSize: 8, color: "#4b5a54" },
});

function PayslipDocument({
  empleadoNombre,
  periodo,
  salarioBruto,
  deducciones,
  salarioNeto,
  fechaPago,
}: PayslipData) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrow}>RECIBO DE NÓMINA · SIMULACIÓN</Text>
        <Text style={styles.title}>Nómina Bancaria</Text>

        <View style={styles.metaRow}>
          <View>
            <Text style={styles.metaLabel}>Empleado</Text>
            <Text style={styles.metaValue}>{empleadoNombre}</Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>Período</Text>
            <Text style={styles.metaValue}>{periodo}</Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>Fecha de pago</Text>
            <Text style={styles.metaValue}>{fechaPago}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Salario bruto</Text>
            <Text style={styles.rowValue}>{currency.format(salarioBruto)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Deducción AFP</Text>
            <Text style={styles.rowValue}>-{currency.format(deducciones.afp)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Deducción ARS</Text>
            <Text style={styles.rowValue}>-{currency.format(deducciones.ars)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Deducción ISR</Text>
            <Text style={styles.rowValue}>-{currency.format(deducciones.isr)}</Text>
          </View>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Salario neto</Text>
          <Text style={styles.totalValue}>{currency.format(salarioNeto)}</Text>
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

export async function generatePayslipPdf(data: PayslipData): Promise<Buffer> {
  return renderToBuffer(<PayslipDocument {...data} />);
}
