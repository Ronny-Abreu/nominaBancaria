"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Spinner } from "@/components/ui/Spinner";
import type { NominaItem, NominaRun } from "@/types/nomina";

const currency = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
});

export function PayrollStatusList({ runId }: { runId: string }) {
  const [run, setRun] = useState<NominaRun | null>(null);
  const [items, setItems] = useState<NominaItem[]>([]);

  useEffect(() => {
    return onSnapshot(doc(db, "nominaRuns", runId), (snap) => {
      setRun(snap.exists() ? (snap.data() as NominaRun) : null);
    });
  }, [runId]);

  useEffect(() => {
    return onSnapshot(collection(db, "nominaRuns", runId, "items"), (snap) => {
      setItems(snap.docs.map((d) => d.data() as NominaItem));
    });
  }, [runId]);

  if (!run) {
    return (
      <div className="flex items-center gap-2 text-ink-muted">
        <Spinner /> Cargando proceso…
      </div>
    );
  }

  return (
    <div>
      <div className="border border-rule bg-paper-2 px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
          <Summary label="Período" value={run.periodo} />
          <Summary label="Total" value={String(run.totalEmpleados)} />
          <Summary label="Procesados" value={String(run.totalProcesados)} />
          <Summary label="Exitosos" value={String(run.totalExitosos)} tone="success" />
          <Summary label="Fallidos" value={String(run.totalFallidos)} tone={run.totalFallidos > 0 ? "error" : undefined} />
          <Summary label="Estado" value={statusLabel(run.status)} />
        </div>
      </div>

      <div className="ledger-perforation" aria-hidden="true" />

      <ul className="divide-y divide-rule border-x border-b border-rule bg-paper">
        {items.map((item) => (
          <li key={item.empleadoUid} className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="font-medium text-ink">{item.nombre}</p>
              <p className="text-sm text-ink-muted">{item.email}</p>
              {item.estado === "error" && item.errorMensaje && (
                <p className="mt-1 text-sm text-rust">{item.errorMensaje}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="tabular-money text-sm text-ink-muted">
                Neto: {currency.format(item.salarioNeto)}
              </span>
              <StatusIcon estado={item.estado} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Summary({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "error";
}) {
  return (
    <span>
      <span className="text-ink-muted">{label}: </span>
      <span
        className={
          tone === "success" ? "font-medium text-ledger-dark" : tone === "error" ? "font-medium text-rust" : "font-medium text-ink"
        }
      >
        {value}
      </span>
    </span>
  );
}

function statusLabel(status: NominaRun["status"]): string {
  switch (status) {
    case "pendiente":
      return "Pendiente";
    case "procesando":
      return "Procesando";
    case "completado":
      return "Completado";
    case "completado_con_errores":
      return "Completado con errores";
  }
}

function StatusIcon({ estado }: { estado: NominaItem["estado"] }) {
  if (estado === "enviado") {
    return (
      <span
        key={`${estado}`}
        className="stamp inline-flex h-8 w-8 items-center justify-center rounded-full bg-ledger/10 text-ledger-dark"
        title="Enviado"
      >
        ✓
      </span>
    );
  }
  if (estado === "error") {
    return (
      <span
        key={`${estado}`}
        className="stamp inline-flex h-8 w-8 items-center justify-center rounded-full bg-rust/10 text-rust"
        title="Error"
      >
        ✕
      </span>
    );
  }
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center" title={estado}>
      <Spinner />
    </span>
  );
}
