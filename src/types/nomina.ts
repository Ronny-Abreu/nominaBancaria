export type EstadoNominaRun =
  | "pendiente"
  | "procesando"
  | "completado"
  | "completado_con_errores";

export type EstadoNominaItem = "pendiente" | "procesando" | "enviado" | "error";

export interface Deducciones {
  afp: number;
  ars: number;
  isr: number;
}

export interface NominaRun {
  runId: string;
  periodo: string;
  createdBy: string;
  createdAt: number;
  status: EstadoNominaRun;
  totalEmpleados: number;
  totalProcesados: number;
  totalExitosos: number;
  totalFallidos: number;
  finishedAt: number | null;
}

export interface NominaItem {
  empleadoUid: string;
  nombre: string;
  email: string;
  salarioBruto: number;
  deducciones: Deducciones;
  salarioNeto: number;
  estado: EstadoNominaItem;
  errorMensaje: string | null;
  intentos: number;
  pdfGeneradoAt: number | null;
  emailEnviadoAt: number | null;
}
