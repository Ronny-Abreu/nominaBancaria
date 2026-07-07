"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import type { NominaRun, EstadoNominaRun } from "@/types/nomina";

const fmt = new Intl.DateTimeFormat("es-DO", { dateStyle: "medium", timeStyle: "short" });

const ESTADO: Record<EstadoNominaRun, { tone: "success" | "warning" | "error" | "pending"; label: string }> = {
  pendiente: { tone: "pending", label: "Pendiente" },
  procesando: { tone: "warning", label: "Procesando" },
  completado: { tone: "success", label: "Completado" },
  completado_con_errores: { tone: "error", label: "Con errores" },
};

export default function HistorialNominaPage() {
  const [runs, setRuns] = useState<NominaRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "nominaRuns"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setRuns(snap.docs.map((d) => d.data() as NominaRun));
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-3xl font-semibold text-ink">Historial de nómina</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Todas las corridas de nómina procesadas. Haz clic para ver el detalle en vivo.
      </p>

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-ink-muted">
            <Spinner /> Cargando historial…
          </div>
        ) : runs.length === 0 ? (
          <p className="py-8 text-ink-muted">Aún no se ha procesado ninguna nómina.</p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Período</TH>
                <TH>Fecha</TH>
                <TH>Estado</TH>
                <TH>Empleados</TH>
                <TH>Exitosos</TH>
                <TH>Fallidos</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {runs.map((run) => {
                const e = ESTADO[run.status];
                return (
                  <TR key={run.runId}>
                    <TD className="font-medium">{run.periodo}</TD>
                    <TD className="whitespace-nowrap">{fmt.format(run.createdAt)}</TD>
                    <TD>
                      <Badge tone={e.tone}>{e.label}</Badge>
                    </TD>
                    <TD>{run.totalEmpleados}</TD>
                    <TD className="text-ledger">{run.totalExitosos}</TD>
                    <TD className={run.totalFallidos > 0 ? "text-rust" : ""}>
                      {run.totalFallidos}
                    </TD>
                    <TD>
                      <Link
                        href={`/nomina/${run.runId}`}
                        className="text-sm font-medium text-ledger hover:underline"
                      >
                        Ver detalle
                      </Link>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </div>
    </div>
  );
}
