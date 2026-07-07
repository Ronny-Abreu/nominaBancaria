"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { EmpleadoForm, type EmpleadoFormValues } from "@/components/empleados/EmpleadoForm";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
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

  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

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
          cuentaBancaria: values.cuentaBancaria,
          banco: values.banco,
          modalidadPago: values.modalidadPago,
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

  async function handleResetPassword() {
    setResetting(true);
    setResetError(null);
    try {
      const res = await fetch(`/api/empleados/${id}/reset-password`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setResetError(
          typeof data?.error === "string" ? data.error : "No se pudo resetear la contraseña."
        );
        return;
      }
      setTempPassword(data.tempPassword);
    } finally {
      setResetting(false);
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
          emailAction={
            <Button
              type="button"
              variant="secondary"
              loading={resetting}
              onClick={handleResetPassword}
              className="whitespace-nowrap"
            >
              Resetear contraseña
            </Button>
          }
          onSubmit={handleSubmit}
        />
        {resetError && <p role="alert" className="mt-3 text-sm text-rust">{resetError}</p>}
        {saved && <p className="mt-3 text-sm text-ledger">Cambios guardados.</p>}
      </div>

      <Modal
        open={!!tempPassword}
        onClose={() => setTempPassword(null)}
        title="Contraseña temporal asignada"
      >
        <p className="text-sm text-ink">
          Comunica esta contraseña temporal a{" "}
          <span className="font-medium">
            {empleado.nombre} {empleado.apellido}
          </span>
          . No volverá a mostrarse. Al iniciar sesión con ella, se le pedirá definir una
          contraseña nueva, y sus sesiones activas anteriores quedaron cerradas.
        </p>
        <p className="tabular-money mt-3 border border-rule bg-paper-2 px-3 py-2 text-lg text-ink">
          {tempPassword}
        </p>
        <Button className="mt-4 w-full" onClick={() => setTempPassword(null)}>
          Entendido
        </Button>
      </Modal>
    </div>
  );
}
