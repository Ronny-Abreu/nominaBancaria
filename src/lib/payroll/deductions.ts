// VALORES APROXIMADOS CON FINES ACADÉMICOS — NO CONSTITUYEN ASESORÍA FISCAL
// NI REFLEJAN NECESARIAMENTE LA NORMATIVA VIGENTE ACTUALIZADA (AFP/ARS/ISR RD).
import type { Deducciones } from "@/types/nomina";

const AFP_RATE = 0.0287;
const ARS_RATE = 0.0304;

// Tramos mensuales ilustrativos, con forma similar al ISR progresivo dominicano.
const ISR_BRACKETS = [
  { upTo: 34685, rate: 0, base: 0 },
  { upTo: 52027, rate: 0.15, base: 0 },
  { upTo: 72317, rate: 0.2, base: 2601.3 }, // 15% de (52027-34685)
  { upTo: Infinity, rate: 0.25, base: 6660.1 }, // acumulado tramo anterior
];

function calcularIsr(baseImponible: number): number {
  if (baseImponible <= ISR_BRACKETS[0].upTo) return 0;

  for (let i = 1; i < ISR_BRACKETS.length; i++) {
    const bracket = ISR_BRACKETS[i];
    const prevUpTo = ISR_BRACKETS[i - 1].upTo;
    if (baseImponible <= bracket.upTo) {
      return bracket.base + (baseImponible - prevUpTo) * bracket.rate;
    }
  }
  return 0;
}

export interface DeduccionesResult extends Deducciones {
  totalDeducciones: number;
  salarioNeto: number;
}

export function calcularDeducciones(salarioBruto: number): DeduccionesResult {
  const afp = round2(salarioBruto * AFP_RATE);
  const ars = round2(salarioBruto * ARS_RATE);
  const baseImponible = salarioBruto - afp - ars;
  const isr = round2(calcularIsr(baseImponible));

  const totalDeducciones = round2(afp + ars + isr);
  const salarioNeto = Math.max(0, round2(salarioBruto - totalDeducciones));

  return { afp, ars, isr, totalDeducciones, salarioNeto };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
