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

  function toggle(uid: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(empleados.map((e) => e.uid)) : new Set());
  }

  async function handleProcesar() {
    setError(null);
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
        setSubmitting(false);
        return;
      }
      fetch(`/api/nomina/${data.runId}/process`, { method: "POST" }).catch(() => { });
      router.push(`/nomina/${data.runId}`);
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

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-ink-muted">
            <Spinner /> Cargando empleados…
          </div>
        ) : empleados.length === 0 ? (
          <p className="py-8 text-ink-muted">No hay empleados activos para procesar.</p>
        ) : (
          <EmpleadoSelector
            empleados={empleados}
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
