"use client";

import { useCallback, useEffect, useState } from "react";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import type { AuditLog, AccionAuditoria } from "@/types/audit";

const ACCIONES: { value: string; label: string }[] = [
  { value: "", label: "Todas las acciones" },
  { value: "login", label: "Inicio de sesión" },
  { value: "logout", label: "Cierre de sesión" },
  { value: "empleado.crear", label: "Empleado creado" },
  { value: "empleado.actualizar", label: "Empleado actualizado" },
  { value: "empleado.baja", label: "Empleado dado de baja" },
  { value: "empleado.eliminar", label: "Empleado eliminado" },
  { value: "usuario.crear", label: "Usuario creado" },
  { value: "nomina.crear", label: "Nómina creada" },
  { value: "nomina.finalizar", label: "Nómina finalizada" },
  { value: "pago.duplicado_bloqueado", label: "Pago duplicado bloqueado" },
  { value: "config.actualizar", label: "Configuración actualizada" },
  { value: "password.reset_solicitado", label: "Reset de contraseña solicitado" },
];

const TONE: Partial<Record<AccionAuditoria, "success" | "warning" | "error" | "neutral">> = {
  login: "success",
  logout: "neutral",
  "empleado.eliminar": "error",
  "empleado.baja": "warning",
  "pago.duplicado_bloqueado": "warning",
  "config.actualizar": "warning",
};

const fmt = new Intl.DateTimeFormat("es-DO", { dateStyle: "short", timeStyle: "medium" });

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [accion, setAccion] = useState("");
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // No llamamos setState de forma síncrona aquí (regla set-state-in-effect):
  // el primer setState ocurre tras el await del fetch.
  const load = useCallback(
    async (accionFilter: string, cursorTs: number | null, append: boolean) => {
      const qs = new URLSearchParams();
      if (accionFilter) qs.set("accion", accionFilter);
      if (cursorTs) qs.set("cursor", String(cursorTs));
      try {
        const res = await fetch(`/api/auditoria?${qs.toString()}`);
        const data = await res.json();
        setLogs((prev) => (append ? [...prev, ...(data.logs ?? [])] : data.logs ?? []));
        setNextCursor(data.nextCursor ?? null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load(accion, null, false);
  }, [accion, load]);

  return (
    <div className="max-w-5xl">
      <h1 className="font-display text-3xl font-semibold text-ink">Auditoría</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Registro inmutable de operaciones críticas del sistema. Solo lectura.
      </p>

      <div className="mt-6 w-64">
        <Select
          label="Filtrar por acción"
          name="accion"
          options={ACCIONES}
          value={accion}
          onChange={(e) => setAccion(e.target.value)}
        />
      </div>

      <div className="mt-6">
        {loading && logs.length === 0 ? (
          <div className="flex items-center gap-2 py-8 text-ink-muted">
            <Spinner /> Cargando registros…
          </div>
        ) : logs.length === 0 ? (
          <p className="py-8 text-ink-muted">No hay registros para este filtro.</p>
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Fecha</TH>
                  <TH>Acción</TH>
                  <TH>Actor</TH>
                  <TH>Rol</TH>
                  <TH>Detalle</TH>
                  <TH>IP</TH>
                </TR>
              </THead>
              <TBody>
                {logs.map((log) => (
                  <TR key={log.id}>
                    <TD className="whitespace-nowrap">{fmt.format(log.timestamp)}</TD>
                    <TD>
                      <Badge tone={TONE[log.accion] ?? "neutral"}>{log.accion}</Badge>
                    </TD>
                    <TD>{log.actorNombre ?? log.actorUid ?? "—"}</TD>
                    <TD className="uppercase">{log.actorRol ?? "—"}</TD>
                    <TD>{log.detalle ?? "—"}</TD>
                    <TD className="tabular-money text-ink-muted">{log.ip ?? "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            {nextCursor && (
              <div className="mt-4">
                <Button
                  variant="secondary"
                  loading={loading}
                  onClick={() => {
                    setLoading(true);
                    load(accion, nextCursor, true);
                  }}
                >
                  Cargar más
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
