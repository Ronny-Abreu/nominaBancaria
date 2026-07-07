"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/useAuth";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

const currency = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
});

interface HistorialEntry {
  runId: string;
  periodo: string;
  estado: "pendiente" | "procesando" | "enviado" | "error";
  salarioBruto: number;
  deducciones: { afp: number; ars: number; isr: number };
  salarioNeto: number;
  emailEnviadoAt: number | null;
}

export default function MiPerfilPage() {
  const { usuario, loading } = useAuth();
  const [historial, setHistorial] = useState<HistorialEntry[] | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const uid = usuario?.uid;
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    fetch("/api/me/nomina")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setHistorial(data.historial ?? []);
      })
      .catch(() => {
        if (!cancelled) setHistorial([]);
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  if (loading || !usuario) {
    return (
      <div className="flex items-center gap-2 text-ink-muted">
        <Spinner /> Cargando perfil…
      </div>
    );
  }

  const selectedReceipt = historial?.find((r) => r.runId === selectedRunId);

  return (
    <div className="max-w-5xl">
      <h1 className="font-display text-3xl font-semibold text-ink">Mi perfil</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Información de solo lectura. Contacta a RRHH para actualizar tus datos.
      </p>

      <div className="mt-8 flex flex-col items-start gap-8 lg:flex-row">
        <div className="w-full max-w-2xl flex-1">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-5 border border-rule bg-paper p-6 sm:grid-cols-2">
        <Field label="Código" value={usuario.codigoEmpleado || "—"} />
        <Field label="Nombre completo" value={`${usuario.nombre} ${usuario.apellido}`} />
        <Field label="Correo" value={usuario.email} />
        <Field label="Puesto" value={usuario.puesto} />
        <Field label="Cédula" value={usuario.cedula} />
        <Field label="Cuenta bancaria" value={usuario.cuentaBancaria || "—"} />
        <Field label="Banco" value={usuario.banco || "—"} />
        <Field
          label="Modalidad de pago"
          value={
            usuario.modalidadPago === "ach"
              ? "ACH"
              : usuario.modalidadPago === "lbtr"
                ? "LBTR"
                : usuario.modalidadPago === "terceros"
                  ? "Pago a terceros"
                  : "—"
          }
        />
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Salario bruto
          </dt>
          <dd className="mt-1 tabular-money text-ink">
            {currency.format(usuario.salarioBruto)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Estado
          </dt>
          <dd className="mt-1">
            <Badge tone={usuario.activo ? "success" : "neutral"}>
              {usuario.activo ? "Activo" : "Inactivo"}
            </Badge>
          </dd>
        </div>
      </dl>

      <div className="mt-8">
        <h2 className="font-display text-xl font-semibold text-ink">
          Historial de recibos de nómina
        </h2>

        {historial === null ? (
          <div className="mt-3 flex items-center gap-2 text-ink-muted">
            <Spinner /> Cargando historial…
          </div>
        ) : historial.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            Tus recibos de pago procesados aparecerán aquí una vez que RRHH ejecute la nómina del período.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-rule border border-rule bg-paper">
            {historial.map((entry) => (
              <li key={entry.runId} className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 sm:flex-nowrap">
                <div className="flex items-center gap-4">
                  <span className="font-medium text-ink">{entry.periodo}</span>
                  <Badge
                    tone={
                      entry.estado === "enviado"
                        ? "success"
                        : entry.estado === "error"
                          ? "error"
                          : "pending"
                    }
                  >
                    {entry.estado}
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  <span className="tabular-money font-medium text-ink">{currency.format(entry.salarioNeto)}</span>
                  <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => setSelectedRunId(entry.runId)}>
                    Ver comprobante
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      </div>

      {selectedReceipt && (
        <div className="w-full rounded-md border border-rule bg-paper p-6 lg:sticky lg:top-8 lg:w-80 lg:shrink-0">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-ink">
              Comprobante
            </h3>
            <button
              className="text-ink-muted hover:text-ink"
              onClick={() => setSelectedRunId(null)}
              aria-label="Cerrar comprobante"
            >
              ✕
            </button>
          </div>
          <p className="mb-4 text-sm text-ink-muted">Período: {selectedReceipt.periodo}</p>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-muted">Salario bruto</span>
              <span className="tabular-money text-ink">{currency.format(selectedReceipt.salarioBruto)}</span>
            </div>
            <div className="border-t border-rule pt-3">
              <p className="mb-2 font-medium text-ink">Deducciones</p>
              <div className="flex justify-between">
                <span className="text-ink-muted">AFP</span>
                <span className="tabular-money text-ink">{currency.format(selectedReceipt.deducciones?.afp || 0)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-ink-muted">ARS</span>
                <span className="tabular-money text-ink">{currency.format(selectedReceipt.deducciones?.ars || 0)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-ink-muted">ISR</span>
                <span className="tabular-money text-ink">{currency.format(selectedReceipt.deducciones?.isr || 0)}</span>
              </div>
            </div>
            <div className="flex justify-between border-t border-rule pt-3 font-semibold">
              <span className="text-ink">Salario neto</span>
              <span className="tabular-money text-ink">{currency.format(selectedReceipt.salarioNeto)}</span>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </dt>
      <dd className="mt-1 text-ink">{value}</dd>
    </div>
  );
}
