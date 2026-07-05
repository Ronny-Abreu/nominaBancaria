import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl font-semibold text-ink">Dashboard</h1>
      <p className="mt-2 text-ink-muted">
        Gestiona empleados y procesa la nómina del período.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/empleados"
          className="border border-rule bg-paper p-5 transition-colors hover:border-ledger"
        >
          <h2 className="font-display text-lg font-semibold text-ink">Empleados</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Altas, modificaciones y bajas lógicas.
          </p>
        </Link>
        <Link
          href="/nomina"
          className="border border-rule bg-paper p-5 transition-colors hover:border-ledger"
        >
          <h2 className="font-display text-lg font-semibold text-ink">Nómina</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Procesar pago en lote y enviar recibos por correo.
          </p>
        </Link>
      </div>
    </div>
  );
}
