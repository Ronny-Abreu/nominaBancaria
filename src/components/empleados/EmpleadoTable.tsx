"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/useAuth";
import { isAdmin } from "@/lib/auth/roles";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import type { Usuario } from "@/types/user";

const currency = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
});

type ActivoFilter = "true" | "false" | "all";

export function EmpleadoTable() {
  const { usuario } = useAuth();
  const admin = isAdmin(usuario?.rol);

  const [empleados, setEmpleados] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ActivoFilter>("true");
  const [search, setSearch] = useState("");
  const [togglingUid, setTogglingUid] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Usuario | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "usuarios"), where("rol", "==", "empleado"));
    return onSnapshot(q, (snap) => {
      setEmpleados(snap.docs.map((d) => d.data() as Usuario));
      setLoading(false);
    });
  }, []);

  const term = search.trim().toLowerCase();
  const filtered = empleados.filter((e) => {
    if (filter !== "all" && e.activo !== (filter === "true")) return false;
    if (!term) return true;
    return (
      `${e.nombre} ${e.apellido}`.toLowerCase().includes(term) ||
      e.email.toLowerCase().includes(term) ||
      (e.codigoEmpleado ?? "").toLowerCase().includes(term)
    );
  });

  async function toggleActivo(empleado: Usuario) {
    setTogglingUid(empleado.uid);
    try {
      await fetch(`/api/empleados/${empleado.uid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !empleado.activo }),
      });
    } finally {
      setTogglingUid(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/empleados/${toDelete.uid}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setDeleteError(
          typeof data?.error === "string" ? data.error : "No se pudo eliminar el empleado."
        );
        return;
      }
      // The onSnapshot listener removes the row automatically once the doc is gone.
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          {(["true", "false", "all"] as ActivoFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass ${
                filter === f ? "bg-ink text-paper" : "bg-paper-2 text-ink-muted hover:text-ink"
              }`}
            >
              {f === "true" ? "Activos" : f === "false" ? "Inactivos" : "Todos"}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, correo o código…"
          className="min-w-64 flex-1 border border-rule bg-paper px-3 py-1.5 text-sm text-ink placeholder:text-ink-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-ink-muted">
          <Spinner /> Cargando empleados…
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-ink-muted">No hay empleados en esta vista.</p>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Código</TH>
              <TH>Nombre</TH>
              <TH>Correo</TH>
              <TH>Puesto</TH>
              <TH>Salario bruto</TH>
              <TH>Cuenta bancaria</TH>
              <TH>Estado</TH>
              <TH>Acciones</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((empleado) => (
              <TR key={empleado.uid}>
                <TD>{empleado.codigoEmpleado || "—"}</TD>
                <TD>{empleado.nombre} {empleado.apellido}</TD>
                <TD>{empleado.email}</TD>
                <TD>{empleado.puesto}</TD>
                <TD className="tabular-money">{currency.format(empleado.salarioBruto)}</TD>
                <TD>{empleado.cuentaBancaria || "—"}</TD>
                <TD>
                  <Badge tone={empleado.activo ? "success" : "neutral"}>
                    {empleado.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </TD>
                <TD>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/empleados/${empleado.uid}`}
                      className="text-sm font-medium text-ledger hover:underline"
                    >
                      Editar
                    </Link>
                    <Button
                      variant={empleado.activo ? "danger" : "secondary"}
                      loading={togglingUid === empleado.uid}
                      onClick={() => toggleActivo(empleado)}
                      className="px-2.5 py-1 text-xs"
                    >
                      {empleado.activo ? "Desactivar" : "Reactivar"}
                    </Button>
                    {admin && (
                      <button
                        onClick={() => {
                          setDeleteError(null);
                          setToDelete(empleado);
                        }}
                        className="text-sm font-medium text-rust hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <Modal
        open={!!toDelete}
        onClose={() => (deleting ? undefined : setToDelete(null))}
        title="Eliminar empleado"
      >
        <p className="text-sm text-ink">
          ¿Seguro que deseas eliminar a{" "}
          <span className="font-medium">
            {toDelete?.nombre} {toDelete?.apellido}
          </span>
          ? Esta acción borra su cuenta y sus datos de forma permanente y no se puede
          deshacer. Para conservar el historial, usa <span className="font-medium">Desactivar</span> en su lugar.
        </p>
        {deleteError && (
          <p role="alert" className="mt-3 text-sm text-rust">
            {deleteError}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setToDelete(null)} disabled={deleting}>
            Cancelar
          </Button>
          <Button variant="danger" loading={deleting} onClick={confirmDelete}>
            Eliminar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
