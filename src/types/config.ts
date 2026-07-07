// Parámetros fiscales configurables (AB-79 / AB-138). Se almacenan en
// `configuracion/parametrosFiscales` para poder ajustar las tasas SIN redeploy.

export interface IsrBracket {
  // Tope superior del tramo (base imponible mensual). `null` = sin tope (último tramo).
  // Se usa null en vez de Infinity porque Firestore no puede almacenar Infinity.
  upTo: number | null;
  rate: number; // p.ej. 0.15 = 15%
  base: number; // impuesto acumulado de los tramos anteriores
}

export interface ParametrosFiscales {
  afpRate: number;
  arsRate: number;
  isrBrackets: IsrBracket[];
  updatedAt: number;
  updatedBy: string;
}
