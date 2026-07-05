import { z } from "zod";

export const nominaCreateSchema = z.object({
  periodo: z.string().regex(/^\d{4}-\d{2}$/, "Formato inválido (YYYY-MM)"),
  empleadoUids: z.array(z.string().min(1)).min(1, "Selecciona al menos un empleado"),
});

export type NominaCreateInput = z.infer<typeof nominaCreateSchema>;
