"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { EmpleadoSelector } from "@/components/nomina/EmpleadoSelector";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import type { Usuario } from "@/types/user";

function currentPeriodo(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function NominaPage() {
  const router = useRouter();
  const [empleados, setEmpleados] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [periodo, setPeriodo] = useState(currentPeriodo());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [omitidos, setOmitidos] = useState<{ uid: string; nombre: string }[]>([]);
  const [runIdListo, setRunIdListo] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "usuarios"),
      where("rol", "==", "empleado"),
      where("activo", "==", true)
    );
    return onSnapshot(q, (snap) => {
      setEmpleados(snap.docs.map((d) => d.data() as Usuario));
      setLoading(false);
    });
  }, []);

  const term = search.trim().toLowerCase();
  const empleadosFiltrados = term
    ? empleados.filter(
        (e) =>
          `${e.nombre} ${e.apellido}`.toLowerCase().includes(term) ||
          e.email.toLowerCase().includes(term) ||
          (e.codigoEmpleado ?? "").toLowerCase().includes(term)
      )
    : empleados;

  function toggle(uid: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(empleadosFiltrados.map((e) => e.uid)) : new Set());
  }

  async function handleProcesar() {
    setError(null);
    setOmitidos([]);
    setRunIdListo(null);
    if (selected.size === 0) {
      setError("Selecciona al menos un empleado.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/nomina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodo, empleadoUids: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "No se pudo iniciar el proceso.");
        if (Array.isArray(data.omitidos)) setOmitidos(data.omitidos);
        setSubmitting(false);
        return;
      }

      // Arranca el procesamiento (fire-and-forget) en ambos casos.
      fetch(`/api/nomina/${data.runId}/process`, { method: "POST" }).catch(() => {});

      // Si se omitieron empleados por pago duplicado, mostramos el aviso y
      // dejamos que el usuario navegue al detalle; si no, redirigimos directo.
      if (Array.isArray(data.omitidos) && data.omitidos.length > 0) {
        setOmitidos(data.omitidos);
        setRunIdListo(data.runId);
        setSubmitting(false);
      } else {
        router.push(`/nomina/${data.runId}`);
      }
    } catch {
      setError("No se pudo iniciar el proceso.");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-ink">Procesar nómina</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Selecciona el período y los empleados a pagar en este lote.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
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

        {!loading && empleados.length > 0 && (
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, correo o código…"
            className="border border-rule bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
          />
        )}

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-ink-muted">
            <Spinner /> Cargando empleados…
          </div>
        ) : empleados.length === 0 ? (
          <p className="py-8 text-ink-muted">No hay empleados activos para procesar.</p>
        ) : empleadosFiltrados.length === 0 ? (
          <p className="py-8 text-ink-muted">Ningún empleado coincide con la búsqueda.</p>
        ) : (
          <EmpleadoSelector
            empleados={empleadosFiltrados}
            selected={selected}
            onToggle={toggle}
            onToggleAll={toggleAll}
          />
        )}

        {error && (
          <p role="alert" className="text-sm text-rust">
            {error}
          </p>
        )}

        {omitidos.length > 0 && (
          <div className="border border-brass/40 bg-brass/10 px-4 py-3 text-sm text-ink">
            <p className="font-medium text-brass">
              {omitidos.length} empleado(s) omitido(s): ya tienen un pago registrado
              para {periodo}.
            </p>
            <ul className="mt-2 list-disc pl-5 text-ink-muted">
              {omitidos.map((o) => (
                <li key={o.uid}>{o.nombre}</li>
              ))}
            </ul>
            {runIdListo && (
              <button
                onClick={() => router.push(`/nomina/${runIdListo}`)}
                className="mt-3 text-sm font-medium text-ledger hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
              >
                Ver estado del proceso →
              </button>
            )}
          </div>
        )}

        <Button
          onClick={handleProcesar}
          loading={submitting}
          disabled={empleados.length === 0}
          className="self-start"
        >
          Procesar nómina ({selected.size})
        </Button>
      </div>
    </div>
  );
}
