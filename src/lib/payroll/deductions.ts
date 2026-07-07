// VALORES APROXIMADOS CON FINES ACADÉMICOS — NO CONSTITUYEN ASESORÍA FISCAL
// NI REFLEJAN NECESARIAMENTE LA NORMATIVA VIGENTE ACTUALIZADA (AFP/ARS/ISR RD).
//
// Las tasas se leen de `ParametrosFiscales` (configurables desde el panel de
// administración, AB-79/AB-138). Estos valores por defecto se usan como semilla
// inicial y como fallback si no hay configuración almacenada.
import type { Deducciones } from "@/types/nomina";
import type { ParametrosFiscales, IsrBracket } from "@/types/config";

export const DEFAULT_PARAMETROS_FISCALES: ParametrosFiscales = {
  afpRate: 0.0287,
  arsRate: 0.0304,
  // Tramos mensuales ilustrativos, con forma similar al ISR progresivo dominicano.
  isrBrackets: [
    { upTo: 34685, rate: 0, base: 0 },
    { upTo: 52027, rate: 0.15, base: 0 },
    { upTo: 72317, rate: 0.2, base: 2601.3 }, // 15% de (52027-34685)
    { upTo: null, rate: 0.25, base: 6660.1 }, // sin tope; acumulado tramo anterior
  ],
  updatedAt: 0,
  updatedBy: "default",
};

const cap = (b: IsrBracket): number => b.upTo ?? Infinity;

function calcularIsr(baseImponible: number, brackets: IsrBracket[]): number {
  if (brackets.length === 0) return 0;
  if (baseImponible <= cap(brackets[0])) return 0;

  for (let i = 1; i < brackets.length; i++) {
    const bracket = brackets[i];
    const prevUpTo = cap(brackets[i - 1]);
    if (baseImponible <= cap(bracket)) {
      return bracket.base + (baseImponible - prevUpTo) * bracket.rate;
    }
  }
  return 0;
}

export interface DeduccionesResult extends Deducciones {
  totalDeducciones: number;
  salarioNeto: number;
}

export function calcularDeducciones(
  salarioBruto: number,
  params: ParametrosFiscales = DEFAULT_PARAMETROS_FISCALES
): DeduccionesResult {
  const afp = round2(salarioBruto * params.afpRate);
  const ars = round2(salarioBruto * params.arsRate);
  const baseImponible = salarioBruto - afp - ars;
  const isr = round2(calcularIsr(baseImponible, params.isrBrackets));

  const totalDeducciones = round2(afp + ars + isr);
  const salarioNeto = Math.max(0, round2(salarioBruto - totalDeducciones));

  return { afp, ars, isr, totalDeducciones, salarioNeto };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
