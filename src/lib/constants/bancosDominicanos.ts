/** Bancos múltiples y asociaciones de ahorros y préstamos con presencia en RD. */
export const BANCOS_DOMINICANOS: string[] = [
  "Banreservas",
  "Banco Popular Dominicano",
  "Banco BHD",
  "Scotiabank",
  "Banco Santa Cruz",
  "Banco Caribe",
  "Banco Vimenca",
  "Banco Ademi",
  "Banco Promerica",
  "Banco BDI (Banco de Ahorro y Crédito)",
  "Asociación Popular de Ahorros y Préstamos (APAP)",
  "Asociación Cibao de Ahorros y Préstamos",
  "Asociación La Nacional de Ahorros y Préstamos",
  "Citibank N.A.",
  "JMMB Bank",
  "Banco Múltiple Activo",
  "Banco Empire",
  "Banco Lopez de Haro",
  "Banco Motor Crédito",
];

export const MODALIDAD_PAGO_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Selecciona…" },
  { value: "ach", label: "ACH (Cámara de Compensación)" },
  { value: "lbtr", label: "LBTR (Liquidación Bruta en Tiempo Real)" },
  { value: "terceros", label: "Pago a terceros" },
];
