import type { Usuario } from "./user";

export type Empleado = Usuario & { rol: "empleado" };

export interface EmpleadoCreatePayload {
  nombre: string;
  apellido: string;
  email: string;
  gender: "M" | "F" | "otro";
  cedula: string;
  puesto: string;
  salarioBruto: number;
  rol?: "admin" | "rrhh" | "empleado";
}

export interface EmpleadoUpdatePayload {
  nombre?: string;
  apellido?: string;
  gender?: "M" | "F" | "otro";
  cedula?: string;
  puesto?: string;
  salarioBruto?: number;
  activo?: boolean;
}
