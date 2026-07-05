import "server-only";
import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

export async function sendPayslipEmail(params: {
  to: string;
  empleadoNombre: string;
  periodo: string;
  pdfBuffer: Buffer;
}): Promise<void> {
  await getTransporter().sendMail({
    from: process.env.MAIL_FROM,
    to: params.to,
    subject: `Recibo de nómina — ${params.periodo}`,
    text: `Hola ${params.empleadoNombre},\n\nAdjunto tu recibo de nómina correspondiente al período ${params.periodo}.\n\nEste es un correo generado automáticamente, favor no responder.`,
    attachments: [
      {
        filename: `recibo-nomina-${params.periodo}.pdf`,
        content: params.pdfBuffer,
      },
    ],
  });
}
