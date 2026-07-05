import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { EmpleadoTable } from "@/components/empleados/EmpleadoTable";

export default function EmpleadosPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">Empleados</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Altas, modificaciones y bajas lógicas.
          </p>
        </div>
        <Link href="/empleados/nuevo">
          <Button>Nuevo empleado</Button>
        </Link>
      </div>

      <div className="mt-6">
        <EmpleadoTable />
      </div>
    </div>
  );
}
