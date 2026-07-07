import { z } from "zod";
import { CEDULA_REGEX } from "@/lib/format/cedula";

const cedulaSchema = z
  .string()
  .trim()
  .regex(CEDULA_REGEX, "Formato inválido (000-0000000-0)");

// "" cubre el estado inicial del <select> cuando aún no se ha elegido nada
// (necesario para cuentas admin/rrhh, que no llevan datos bancarios).
const modalidadPagoSchema = z.union([z.enum(["ach", "lbtr", "terceros"]), z.literal("")]);

/** true cuando el rol objetivo es empleado (o no se especifica, que por defecto es empleado). */
function esEmpleado(rol?: string): boolean {
  return !rol || rol === "empleado";
}

export const empleadoCreateSchema = z
  .object({
    nombre: z.string().trim().min(1, "Requerido").max(80),
    apellido: z.string().trim().min(1, "Requerido").max(80),
    email: z.string().trim().email("Correo inválido"),
    gender: z.enum(["M", "F", "otro"]),
    cedula: cedulaSchema,
    puesto: z.string().trim().min(1, "Requerido").max(80),
    salarioBruto: z.number().min(0),
    cuentaBancaria: z.string().trim().max(40).optional().default(""),
    banco: z.string().trim().max(80).optional().default(""),
    modalidadPago: modalidadPagoSchema.optional().default(""),
    rol: z.enum(["admin", "rrhh", "empleado"]).optional(),
  })
  // Los datos de nómina (salario y bancarios) son obligatorios solo para
  // empleados; las cuentas admin/rrhh no los llevan.
  .refine((d) => (esEmpleado(d.rol) ? d.salarioBruto > 0 : true), {
    message: "Debe ser mayor a 0",
    path: ["salarioBruto"],
  })
  .refine((d) => (esEmpleado(d.rol) ? !!d.cuentaBancaria.trim() : true), {
    message: "Requerido",
    path: ["cuentaBancaria"],
  })
  .refine((d) => (esEmpleado(d.rol) ? !!d.banco.trim() : true), {
    message: "Requerido",
    path: ["banco"],
  })
  .refine((d) => (esEmpleado(d.rol) ? d.modalidadPago !== "" : true), {
    message: "Requerido",
    path: ["modalidadPago"],
  });

// Actualización = patch parcial. TODOS los campos son opcionales para que
// operaciones puntuales (p. ej. PUT { activo: false } al desactivar) no exijan
// reenviar el resto del formulario.
export const empleadoUpdateSchema = z.object({
  nombre: z.string().trim().min(1).max(80).optional(),
  apellido: z.string().trim().min(1).max(80).optional(),
  gender: z.enum(["M", "F", "otro"]).optional(),
  cedula: cedulaSchema.optional(),
  puesto: z.string().trim().min(1).max(80).optional(),
  salarioBruto: z.number().positive().optional(),
  cuentaBancaria: z.string().trim().max(40).optional(),
  banco: z.string().trim().max(80).optional(),
  modalidadPago: modalidadPagoSchema.optional(),
  activo: z.boolean().optional(),
});

export type EmpleadoCreateInput = z.infer<typeof empleadoCreateSchema>;
export type EmpleadoUpdateInput = z.infer<typeof empleadoUpdateSchema>;
