// Registro inmutable de auditoría (append-only). Ver AB-100 del backlog.
// Cada operación crítica del sistema deja una entrada aquí. Los documentos
// NUNCA se actualizan ni se eliminan: las reglas de Firestore bloquean toda
// escritura desde el cliente y el código servidor solo hace `set` de nuevos docs.

export type AccionAuditoria =
  | "login"
  | "logout"
  | "empleado.crear"
  | "empleado.actualizar"
  | "empleado.baja"
  | "empleado.eliminar"
  | "empleado.reset_password"
  | "usuario.crear"
  | "nomina.crear"
  | "nomina.finalizar"
  | "pago.duplicado_bloqueado"
  | "pago.rebotado"
  | "config.actualizar"
  | "password.reset_solicitado";

export interface AuditLog {
  id: string;
  timestamp: number;
  accion: AccionAuditoria;
  actorUid: string | null;
  actorNombre: string | null;
  actorRol: string | null;
  ip: string | null;
  entidad: string | null;
  entidadId: string | null;
  detalle: string | null;
}

export type AuditLogInput = Omit<AuditLog, "id" | "timestamp">;
