export type Rol = "admin" | "rrhh" | "empleado";

export type Gender = "M" | "F" | "otro";

/** Modalidad de desembolso bancario para el depósito de nómina. */
export type ModalidadPago = "ach" | "lbtr" | "terceros";

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
  cuentaBancaria: string;
  /** Nombre del banco dominicano donde se recibe el depósito. Vacío si no aplica. */
  banco: string;
  /** "" cuando no se ha definido (p. ej. admin/rrhh sin datos de nómina). */
  modalidadPago: ModalidadPago | "";
  codigoEmpleado: string;
  activo: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  mustChangePassword: boolean;
}

export type UsuarioInput = Omit<
  Usuario,
  "uid" | "createdAt" | "updatedAt" | "createdBy" | "mustChangePassword" | "codigoEmpleado"
>;
