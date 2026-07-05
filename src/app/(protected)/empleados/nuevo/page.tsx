"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/useAuth";
import { EmpleadoForm, type EmpleadoFormValues } from "@/components/empleados/EmpleadoForm";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export default function NuevoEmpleadoPage() {
  const router = useRouter();
  const { usuario } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  async function handleSubmit(values: EmpleadoFormValues) {
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/empleados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          salarioBruto: Number(values.salarioBruto),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(typeof data.error === "string" ? data.error : "No se pudo crear el empleado.");
        return;
      }
      setTempPassword(data.tempPassword);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-ink">Nuevo empleado</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Se creará una cuenta con una contraseña temporal que deberás comunicar al empleado.
      </p>

      <div className="mt-6">
        <EmpleadoForm
          mode="create"
          allowRoleSelect={usuario?.rol === "admin"}
          submitting={submitting}
          serverError={serverError}
          onSubmit={handleSubmit}
        />
      </div>

      <Modal open={!!tempPassword} onClose={() => router.push("/empleados")} title="Empleado creado">
        <p className="text-sm text-ink">
          Comunica esta contraseña temporal al empleado. No volverá a mostrarse.
        </p>
        <p className="tabular-money mt-3 border border-rule bg-paper-2 px-3 py-2 text-lg text-ink">
          {tempPassword}
        </p>
        <Button className="mt-4 w-full" onClick={() => router.push("/empleados")}>
          Entendido
        </Button>
      </Modal>
    </div>
  );
}
