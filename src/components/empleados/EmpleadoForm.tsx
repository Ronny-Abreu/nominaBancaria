"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { Usuario } from "@/types/user";

export interface EmpleadoFormValues {
  nombre: string;
  apellido: string;
  email: string;
  gender: "M" | "F" | "otro";
  cedula: string;
  puesto: string;
  salarioBruto: string;
  rol: "admin" | "rrhh" | "empleado";
}

interface EmpleadoFormProps {
  mode: "create" | "edit";
  defaultValues?: Partial<Usuario>;
  allowRoleSelect?: boolean;
  rolOptions?: Array<{ value: EmpleadoFormValues["rol"]; label: string }>;
  submitting?: boolean;
  serverError?: string | null;
  onSubmit: (values: EmpleadoFormValues) => void | Promise<void>;
}

const GENDER_OPTIONS = [
  { value: "F", label: "Femenino" },
  { value: "M", label: "Masculino" },
  { value: "otro", label: "Otro" },
];

const DEFAULT_ROL_OPTIONS: Array<{ value: EmpleadoFormValues["rol"]; label: string }> = [
  { value: "empleado", label: "Empleado" },
  { value: "rrhh", label: "RRHH" },
  { value: "admin", label: "Admin" },
];

export function EmpleadoForm({
  mode,
  defaultValues,
  allowRoleSelect = false,
  rolOptions = DEFAULT_ROL_OPTIONS,
  submitting = false,
  serverError,
  onSubmit,
}: EmpleadoFormProps) {
  const [values, setValues] = useState<EmpleadoFormValues>({
    nombre: defaultValues?.nombre ?? "",
    apellido: defaultValues?.apellido ?? "",
    email: defaultValues?.email ?? "",
    gender: defaultValues?.gender ?? "F",
    cedula: defaultValues?.cedula ?? "",
    puesto: defaultValues?.puesto ?? "",
    salarioBruto: defaultValues?.salarioBruto?.toString() ?? "",
    rol: defaultValues?.rol ?? "empleado",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof EmpleadoFormValues, string>>>({});

  function update<K extends keyof EmpleadoFormValues>(key: K, value: EmpleadoFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!values.nombre.trim()) next.nombre = "Requerido";
    if (!values.apellido.trim()) next.apellido = "Requerido";
    if (mode === "create" && !/^\S+@\S+\.\S+$/.test(values.email)) next.email = "Correo inválido";
    if (!values.cedula.trim()) next.cedula = "Requerido";
    if (!values.puesto.trim()) next.puesto = "Requerido";
    if (values.rol === "empleado") {
      const salario = Number(values.salarioBruto);
      if (!values.salarioBruto || Number.isNaN(salario) || salario <= 0) {
        next.salarioBruto = "Debe ser mayor a 0";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Nombre"
          name="nombre"
          value={values.nombre}
          onChange={(e) => update("nombre", e.target.value)}
          error={errors.nombre}
        />
        <Input
          label="Apellido"
          name="apellido"
          value={values.apellido}
          onChange={(e) => update("apellido", e.target.value)}
          error={errors.apellido}
        />
      </div>

      {mode === "create" ? (
        <Input
          label="Correo electrónico"
          type="email"
          name="email"
          value={values.email}
          onChange={(e) => update("email", e.target.value)}
          error={errors.email}
        />
      ) : (
        <Input label="Correo electrónico" value={values.email} disabled hint="No editable." />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Cédula"
          name="cedula"
          value={values.cedula}
          onChange={(e) => update("cedula", e.target.value)}
          error={errors.cedula}
        />
        <Select
          label="Género"
          name="gender"
          options={GENDER_OPTIONS}
          value={values.gender}
          onChange={(e) => update("gender", e.target.value as EmpleadoFormValues["gender"])}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Puesto"
          name="puesto"
          value={values.puesto}
          onChange={(e) => update("puesto", e.target.value)}
          error={errors.puesto}
        />
        {values.rol === "empleado" && (
          <Input
            label="Salario bruto (RD$)"
            type="number"
            min="0"
            step="0.01"
            name="salarioBruto"
            value={values.salarioBruto}
            onChange={(e) => update("salarioBruto", e.target.value)}
            error={errors.salarioBruto}
          />
        )}
      </div>

      {mode === "create" && allowRoleSelect && (
        <Select
          label="Rol"
          name="rol"
          options={rolOptions}
          value={values.rol}
          onChange={(e) => update("rol", e.target.value as EmpleadoFormValues["rol"])}
        />
      )}

      {serverError && (
        <p role="alert" className="text-sm text-rust">
          {serverError}
        </p>
      )}

      <Button type="submit" loading={submitting} className="mt-2 self-start">
        {mode === "create" ? "Registrar empleado" : "Guardar cambios"}
      </Button>
    </form>
  );
}
