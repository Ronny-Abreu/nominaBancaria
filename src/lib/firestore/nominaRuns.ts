import "server-only";
import { randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { calcularDeducciones } from "@/lib/payroll/deductions";
import { getParametrosFiscales } from "@/lib/firestore/config";
import type { NominaRun, NominaItem, EstadoNominaItem } from "@/types/nomina";
import type { Usuario } from "@/types/user";

function runRef(runId: string) {
  return adminDb.collection("nominaRuns").doc(runId);
}

function itemRef(runId: string, uid: string) {
  return runRef(runId).collection("items").doc(uid);
}

export async function createNominaRun(
  periodo: string,
  createdBy: string,
  empleados: Usuario[]
): Promise<string> {
  const runId = randomUUID();
  const now = Date.now();

  const run: NominaRun = {
    runId,
    periodo,
    createdBy,
    createdAt: now,
    status: "pendiente",
    totalEmpleados: empleados.length,
    totalProcesados: 0,
    totalExitosos: 0,
    totalFallidos: 0,
    finishedAt: null,
  };

  // Snapshot de los parámetros fiscales vigentes al momento de la corrida.
  const parametros = await getParametrosFiscales();

  const batch = adminDb.batch();
  batch.set(runRef(runId), run);

  for (const empleado of empleados) {
    const { afp, ars, isr, salarioNeto } = calcularDeducciones(empleado.salarioBruto, parametros);
    const item: NominaItem = {
      empleadoUid: empleado.uid,
      nombre: `${empleado.nombre} ${empleado.apellido}`,
      email: empleado.email,
      salarioBruto: empleado.salarioBruto,
      deducciones: { afp, ars, isr },
      salarioNeto,
      estado: "pendiente",
      errorMensaje: null,
      intentos: 0,
      pdfGeneradoAt: null,
      emailEnviadoAt: null,
    };
    batch.set(itemRef(runId, empleado.uid), item);
  }

  await batch.commit();
  return runId;
}

export async function getNominaRun(runId: string): Promise<NominaRun | null> {
  const snap = await runRef(runId).get();
  return snap.exists ? (snap.data() as NominaRun) : null;
}

export async function getNominaItems(runId: string): Promise<NominaItem[]> {
  const snap = await runRef(runId).collection("items").get();
  return snap.docs.map((d) => d.data() as NominaItem);
}

export async function markItemEstado(
  runId: string,
  uid: string,
  estado: EstadoNominaItem,
  extra: Partial<NominaItem> = {}
): Promise<void> {
  await itemRef(runId, uid).update({ estado, ...extra });
}

export async function incrementRunCounters(
  runId: string,
  fields: { totalProcesados?: number; totalExitosos?: number; totalFallidos?: number }
): Promise<void> {
  const increments: Record<string, FirebaseFirestore.FieldValue> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value) increments[key] = FieldValue.increment(value);
  }
  await runRef(runId).update(increments);
}

export async function finalizeRun(runId: string): Promise<void> {
  const run = await getNominaRun(runId);
  if (!run) return;
  await runRef(runId).update({
    status: run.totalFallidos > 0 ? "completado_con_errores" : "completado",
    finishedAt: Date.now(),
  });
}

export async function markRunProcesando(runId: string): Promise<void> {
  await runRef(runId).update({ status: "procesando" });
}
