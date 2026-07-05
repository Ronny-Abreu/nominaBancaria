"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { EmpleadoForm, type EmpleadoFormValues } from "@/components/empleados/EmpleadoForm";
import type { Usuario } from "@/types/user";

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "usuarios"), where("rol", "in", ["admin", "rrhh"]));
    return onSnapshot(q, (snap) => {
      setUsuarios(snap.docs.map((d) => d.data() as Usuario));
      setLoading(false);
    });
  }, []);

  async function handleSubmit(values: EmpleadoFormValues) {
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, salarioBruto: Number(values.salarioBruto) || 0 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(typeof data.error === "string" ? data.error : "No se pudo crear el usuario.");
        return;
      }
      setShowForm(false);
      setTempPassword(data.tempPassword);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">Usuarios</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Cuentas de administración (Admin / RRHH).
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>Nuevo usuario</Button>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-ink-muted">
            <Spinner /> Cargando usuarios…
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Nombre</TH>
                <TH>Correo</TH>
                <TH>Rol</TH>
                <TH>Estado</TH>
              </TR>
            </THead>
            <TBody>
              {usuarios.map((u) => (
                <TR key={u.uid}>
                  <TD>{u.nombre} {u.apellido}</TD>
                  <TD>{u.email}</TD>
                  <TD>
                    <Badge tone="neutral">{u.rol}</Badge>
                  </TD>
                  <TD>
                    <Badge tone={u.activo ? "success" : "neutral"}>
                      {u.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nuevo usuario">
        <EmpleadoForm
          mode="create"
          defaultValues={{ rol: "rrhh" }}
          allowRoleSelect
          rolOptions={[
            { value: "rrhh", label: "RRHH" },
            { value: "admin", label: "Admin" },
          ]}
          submitting={submitting}
          serverError={serverError}
          onSubmit={handleSubmit}
        />
      </Modal>

      <Modal open={!!tempPassword} onClose={() => setTempPassword(null)} title="Usuario creado">
        <p className="text-sm text-ink">
          Comunica esta contraseña temporal al usuario. No volverá a mostrarse.
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
