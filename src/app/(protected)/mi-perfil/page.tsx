"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/useAuth";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";

const currency = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
});

interface HistorialEntry {
  runId: string;
  periodo: string;
  estado: "pendiente" | "procesando" | "enviado" | "error";
  salarioNeto: number;
  emailEnviadoAt: number | null;
}

export default function MiPerfilPage() {
  const { usuario, loading } = useAuth();
  const [historial, setHistorial] = useState<HistorialEntry[] | null>(null);

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

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-ink">Mi perfil</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Información de solo lectura. Contacta a RRHH para actualizar tus datos.
      </p>

      <dl className="mt-8 grid grid-cols-1 gap-x-8 gap-y-5 border border-rule bg-paper p-6 sm:grid-cols-2">
        <Field label="Nombre completo" value={`${usuario.nombre} ${usuario.apellido}`} />
        <Field label="Correo" value={usuario.email} />
        <Field label="Puesto" value={usuario.puesto} />
        <Field label="Cédula" value={usuario.cedula} />
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
              <li key={entry.runId} className="flex items-center justify-between px-4 py-3">
                <span className="text-ink">{entry.periodo}</span>
                <span className="tabular-money text-ink">{currency.format(entry.salarioNeto)}</span>
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
              </li>
            ))}
          </ul>
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
