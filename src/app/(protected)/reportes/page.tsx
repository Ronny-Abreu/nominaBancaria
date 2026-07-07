"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

function currentPeriodo(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function ReportesPage() {
  const [periodo, setPeriodo] = useState(currentPeriodo());
  const [downloading, setDownloading] = useState<"pdf" | "excel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function descargar(formato: "pdf" | "excel") {
    setError(null);
    setDownloading(formato);
    try {
      const res = await fetch(`/api/reportes/nomina?periodo=${periodo}&formato=${formato}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(
          typeof data?.error === "string"
            ? data.error
            : "No se pudo generar el reporte."
        );
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nomina-${periodo}.${formato === "excel" ? "xlsx" : "pdf"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("No se pudo generar el reporte.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl font-semibold text-ink">Reportes de nómina</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Genera el consolidado de un período (salarios, deducciones AFP/ARS/ISR y neto)
        con todos los empleados pagados, en PDF o Excel.
      </p>

      <div className="mt-6 flex flex-col gap-1.5">
        <label htmlFor="periodo" className="text-sm font-medium text-ink">
          Período
        </label>
        <input
          id="periodo"
          type="month"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="w-48 border border-rule bg-paper px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
        />
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-rust">
          {error}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        <Button
          onClick={() => descargar("pdf")}
          loading={downloading === "pdf"}
          disabled={downloading !== null}
        >
          Descargar PDF
        </Button>
        <Button
          variant="secondary"
          onClick={() => descargar("excel")}
          loading={downloading === "excel"}
          disabled={downloading !== null}
        >
          Descargar Excel
        </Button>
      </div>
    </div>
  );
}
