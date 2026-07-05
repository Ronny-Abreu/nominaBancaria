"use client";

import { useParams } from "next/navigation";
import { PayrollStatusList } from "@/components/nomina/PayrollStatusList";

export default function NominaRunPage() {
  const { runId } = useParams<{ runId: string }>();

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl font-semibold text-ink">Proceso de nómina</h1>
      <p className="mt-1 text-sm text-ink-muted">
        El estado se actualiza en tiempo real a medida que se envía cada recibo.
      </p>

      <div className="mt-6">
        <PayrollStatusList runId={runId} />
      </div>
    </div>
  );
}
