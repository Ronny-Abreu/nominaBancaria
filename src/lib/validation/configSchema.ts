import { z } from "zod";

export const isrBracketSchema = z.object({
  upTo: z.number().positive().nullable(),
  rate: z.number().min(0).max(1),
  base: z.number().min(0),
});

export const parametrosFiscalesSchema = z.object({
  afpRate: z.number().min(0).max(1),
  arsRate: z.number().min(0).max(1),
  isrBrackets: z.array(isrBracketSchema).min(1, "Debe haber al menos un tramo"),
});

export type ParametrosFiscalesInput = z.infer<typeof parametrosFiscalesSchema>;
