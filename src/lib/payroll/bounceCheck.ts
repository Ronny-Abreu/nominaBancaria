import "server-only";
import { ImapFlow } from "imapflow";

/**
 * Verificación de rebotes de correo (AB: "no procesar el pago si el Mail
 * Delivery Subsystem de Google no encuentra el email").
 *
 * Gmail acepta el mensaje en la transacción SMTP y, si el buzón no existe,
 * rebota DESPUÉS de forma asíncrona: el "Mail Delivery Subsystem"
 * (mailer-daemon@googlemail.com) envía un aviso de fallo (DSN) a la cuenta
 * remitente. Aquí nos conectamos por IMAP a esa cuenta, buscamos esos avisos y
 * extraemos las direcciones que fallaron de forma permanente (status 5.x.x),
 * para poder revertir el pago de esos empleados.
 *
 * Requiere IMAP habilitado en la cuenta de Gmail (usa las mismas credenciales
 * del SMTP). Si no está configurado, degrada a "sin rebotes" sin romper nada.
 */

function imapConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_APP_PASSWORD);
}

const FINAL_RECIPIENT_RE = /Final-Recipient:\s*rfc822;\s*<?([^\s<>]+@[^\s<>]+?)>?\s/gi;

export interface BounceCheckResult {
  configured: boolean;
  bounced: Set<string>; // correos en minúsculas que rebotaron de forma permanente
}

export async function findBouncedRecipients(sinceMs: number): Promise<BounceCheckResult> {
  if (!imapConfigured()) {
    return { configured: false, bounced: new Set() };
  }

  const client = new ImapFlow({
    host: process.env.IMAP_HOST ?? "imap.gmail.com",
    port: Number(process.env.IMAP_PORT ?? 993),
    secure: true,
    auth: {
      user: process.env.SMTP_USER as string,
      pass: process.env.SMTP_APP_PASSWORD as string,
    },
    logger: false,
  });

  const bounced = new Set<string>();
  // Un pequeño margen hacia atrás cubre desfases de reloj entre el envío y el
  // sello de tiempo del rebote.
  const since = new Date(sinceMs - 5 * 60 * 1000);

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const uids = await client.search(
        { since, from: "mailer-daemon" },
        { uid: true }
      );

      if (uids && uids.length > 0) {
        for await (const msg of client.fetch(uids, { source: true }, { uid: true })) {
          if (!msg.source) continue;
          const text = msg.source.toString("utf8");
          // Solo fallos permanentes (5.x.x); ignoramos avisos de retraso (4.x.x).
          const esPermanente = /Status:\s*5\.\d+\.\d+/i.test(text) || /Action:\s*failed/i.test(text);
          if (!esPermanente) continue;

          let m: RegExpExecArray | null;
          FINAL_RECIPIENT_RE.lastIndex = 0;
          while ((m = FINAL_RECIPIENT_RE.exec(text)) !== null) {
            bounced.add(m[1].trim().toLowerCase());
          }
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    console.error("findBouncedRecipients: fallo al leer IMAP:", err);
    // Degradar: devolvemos lo que se haya podido recolectar sin romper el flujo.
    try {
      await client.close();
    } catch {
      // ignore
    }
  }

  return { configured: true, bounced };
}
