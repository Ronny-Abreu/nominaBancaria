import "server-only";
import { resolveMx } from "dns/promises";

/**
 * Se lanza cuando el correo del empleado es indudablemente no entregable
 * (dominio inexistente o rechazado por el servidor SMTP). El worker de nómina
 * la trata como fallo: NO marca el pago como enviado ni crea el marcador de
 * idempotencia, de modo que ese empleado no se da por pagado.
 */
export class EmailUndeliverableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailUndeliverableError";
  }
}

const domainMxCache = new Map<string, boolean>();

/**
 * Verificación de entregabilidad *previa al envío*, en línea y sin servicios
 * externos: confirma que el dominio del correo tenga registros MX. Esto atrapa
 * al instante los casos más comunes de correo inexistente (dominios mal
 * escritos, p. ej. `@gmial.com`) antes de enviar nada.
 *
 * NO detecta el caso "dominio válido, buzón inexistente" (p. ej. una dirección
 * de Gmail que no existe): Gmail acepta el mensaje y rebota después de forma
 * asíncrona. Ese caso lo cubre la verificación de rebotes por IMAP
 * (`bounceCheck.ts`).
 */
export async function assertDeliverable(email: string): Promise<void> {
  const at = email.lastIndexOf("@");
  const domain = at >= 0 ? email.slice(at + 1).trim().toLowerCase() : "";
  if (!domain) {
    throw new EmailUndeliverableError("Dirección de correo inválida");
  }

  const cached = domainMxCache.get(domain);
  if (cached === true) return;
  if (cached === false) {
    throw new EmailUndeliverableError(
      `El dominio "${domain}" no puede recibir correos (sin registros MX)`
    );
  }

  try {
    const records = await resolveMx(domain);
    const ok = Array.isArray(records) && records.length > 0;
    domainMxCache.set(domain, ok);
    if (!ok) {
      throw new EmailUndeliverableError(
        `El dominio "${domain}" no puede recibir correos (sin registros MX)`
      );
    }
  } catch (err) {
    if (err instanceof EmailUndeliverableError) throw err;
    // ENOTFOUND / ENODATA = el dominio no existe o no tiene MX → no entregable.
    const code = (err as { code?: string })?.code;
    if (code === "ENOTFOUND" || code === "ENODATA") {
      domainMxCache.set(domain, false);
      throw new EmailUndeliverableError(
        `El dominio "${domain}" no existe o no puede recibir correos`
      );
    }
    // Cualquier otro error de DNS (timeout, red): no lo tratamos como no
    // entregable para no bloquear pagos por un fallo transitorio de red.
    return;
  }
}
