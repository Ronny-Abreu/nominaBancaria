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
  const [error, setError] = useState<string | null>(null);

  // Fetcher puro (no toca estado): retorna los datos o un error. El setState
  // ocurre en los callbacks (efecto / handler), no de forma síncrona en el
  // cuerpo del efecto — así se respeta la regla set-state-in-effect.
  const fetchLogs = useCallback(
    async (
      accionFilter: string,
      cursorTs: number | null
    ): Promise<{ logs?: AuditLog[]; nextCursor?: number | null; error?: string }> => {
      const qs = new URLSearchParams();
      if (accionFilter) qs.set("accion", accionFilter);
      if (cursorTs) qs.set("cursor", String(cursorTs));

      const res = await fetch(`/api/auditoria?${qs.toString()}`).catch(() => null);
      if (!res || !res.ok) {
        const data = res ? await res.json().catch(() => null) : null;
        return {
          error:
            typeof data?.error === "string" ? data.error : "No se pudo cargar la auditoría.",
        };
      }
      const data = await res.json().catch(() => null);
      return { logs: data?.logs ?? [], nextCursor: data?.nextCursor ?? null };
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    fetchLogs(accion, null).then((r) => {
      if (cancelled) return;
      if (r.error) {
        setError(r.error);
        setLogs([]);
        setNextCursor(null);
      } else {
        setError(null);
        setLogs(r.logs ?? []);
        setNextCursor(r.nextCursor ?? null);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [accion, fetchLogs]);

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
        ) : error ? (
          <p role="alert" className="py-8 text-rust">
            {error}
          </p>
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
                    fetchLogs(accion, nextCursor).then((r) => {
                      if (r.error) {
                        setError(r.error);
                      } else {
                        setError(null);
                        setLogs((prev) => [...prev, ...(r.logs ?? [])]);
                        setNextCursor(r.nextCursor ?? null);
                      }
                      setLoading(false);
                    });
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
