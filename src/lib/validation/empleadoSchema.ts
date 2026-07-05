import { z } from "zod";

export const empleadoCreateSchema = z
  .object({
    nombre: z.string().trim().min(1, "Requerido").max(80),
    apellido: z.string().trim().min(1, "Requerido").max(80),
    email: z.string().trim().email("Correo inválido"),
    gender: z.enum(["M", "F", "otro"]),
    cedula: z.string().trim().min(1, "Requerido").max(20),
    puesto: z.string().trim().min(1, "Requerido").max(80),
    salarioBruto: z.number().min(0),
    rol: z.enum(["admin", "rrhh", "empleado"]).optional(),
  })
  .refine(
    (data) => {
      const isEmpleado = !data.rol || data.rol === "empleado";
      return isEmpleado ? data.salarioBruto > 0 : true;
    },
    { message: "Debe ser mayor a 0", path: ["salarioBruto"] }
  );

export const empleadoUpdateSchema = z.object({
  nombre: z.string().trim().min(1).max(80).optional(),
  apellido: z.string().trim().min(1).max(80).optional(),
  gender: z.enum(["M", "F", "otro"]).optional(),
  cedula: z.string().trim().min(1).max(20).optional(),
  puesto: z.string().trim().min(1).max(80).optional(),
  salarioBruto: z.number().positive().optional(),
  activo: z.boolean().optional(),
});

export type EmpleadoCreateInput = z.infer<typeof empleadoCreateSchema>;
export type EmpleadoUpdateInput = z.infer<typeof empleadoUpdateSchema>;
