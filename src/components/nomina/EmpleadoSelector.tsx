"use client";

import type { Usuario } from "@/types/user";

interface EmpleadoSelectorProps {
  empleados: Usuario[];
  selected: Set<string>;
  onToggle: (uid: string) => void;
  onToggleAll: (checked: boolean) => void;
}

export function EmpleadoSelector({
  empleados,
  selected,
  onToggle,
  onToggleAll,
}: EmpleadoSelectorProps) {
  const allSelected = empleados.length > 0 && selected.size === empleados.length;

  return (
    <div className="border border-rule">
      <label className="flex items-center gap-3 border-b border-rule bg-paper-2 px-4 py-2.5 text-sm font-medium text-ink">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={(e) => onToggleAll(e.target.checked)}
          className="h-4 w-4 accent-ledger"
        />
        Seleccionar todos ({empleados.length})
      </label>
      <ul className="max-h-80 divide-y divide-rule overflow-y-auto">
        {empleados.map((empleado) => (
          <li key={empleado.uid}>
            <label className="flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-paper-2/60">
              <span className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selected.has(empleado.uid)}
                  onChange={() => onToggle(empleado.uid)}
                  className="h-4 w-4 accent-ledger"
                />
                <span className="text-ink">
                  {empleado.nombre} {empleado.apellido}
                </span>
                {empleado.codigoEmpleado && (
                  <span className="font-mono text-xs text-ink-muted">
                    {empleado.codigoEmpleado}
                  </span>
                )}
              </span>
              <span className="text-ink-muted">{empleado.email}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
