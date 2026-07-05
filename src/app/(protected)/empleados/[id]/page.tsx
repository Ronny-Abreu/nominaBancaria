"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { EmpleadoForm, type EmpleadoFormValues } from "@/components/empleados/EmpleadoForm";
import { Spinner } from "@/components/ui/Spinner";
import type { Usuario } from "@/types/user";

export default function EditarEmpleadoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [empleado, setEmpleado] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/empleados/${id}`)
      .then((res) => res.json())
      .then((data) => setEmpleado(data.empleado ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(values: EmpleadoFormValues) {
    setSubmitting(true);
    setServerError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/empleados/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: values.nombre,
          apellido: values.apellido,
          gender: values.gender,
          cedula: values.cedula,
          puesto: values.puesto,
          salarioBruto: Number(values.salarioBruto),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(typeof data.error === "string" ? data.error : "No se pudo guardar.");
        return;
      }
      setEmpleado(data.empleado);
      setSaved(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-ink-muted">
        <Spinner /> Cargando…
      </div>
    );
  }

  if (!empleado) {
    return (
      <div>
        <p className="text-ink-muted">No se encontró este empleado.</p>
        <button
          onClick={() => router.push("/empleados")}
          className="mt-2 text-sm font-medium text-ledger hover:underline"
        >
          Volver a empleados
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-ink">
        Editar {empleado.nombre} {empleado.apellido}
      </h1>

      <div className="mt-6">
        <EmpleadoForm
          mode="edit"
          defaultValues={empleado}
          submitting={submitting}
          serverError={serverError}
          onSubmit={handleSubmit}
        />
        {saved && <p className="mt-3 text-sm text-ledger">Cambios guardados.</p>}
      </div>
    </div>
  );
}
