export type Rol = "admin" | "rrhh" | "empleado";

export type Gender = "M" | "F" | "otro";

export interface Usuario {
  uid: string;
  rol: Rol;
  nombre: string;
  apellido: string;
  email: string;
  gender: Gender;
  cedula: string;
  puesto: string;
  salarioBruto: number;
  activo: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  mustChangePassword: boolean;
}

export type UsuarioInput = Omit<
  Usuario,
  "uid" | "createdAt" | "updatedAt" | "createdBy" | "mustChangePassword"
>;
