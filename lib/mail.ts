import nodemailer, { type Transporter } from "nodemailer";

// ---------------------------------------------------------------------------
// Envío SMTP con Nodemailer.
//
// En desarrollo, MailHog (MAILHOG_HOST/MAILHOG_PORT, como pide el
// enunciado): acepta todo y lo muestra en localhost:8025 sin entregarlo.
// Con un servidor propio, cualquier SMTP real con SMTP_HOST, SMTP_PORT,
// SMTP_USER y SMTP_PASS: el código no cambia, solo la configuración.
//
// MAIL_TRANSPORT=outbox (la demo publicada): no se manda nada; cada mail se
// guarda en MongoDB y se ve en /bandeja. Render gratis bloquea los puertos
// SMTP (25, 465 y 587): la bandeja es el MailHog de la versión en línea.
// ---------------------------------------------------------------------------

export function isOutbox(env: Record<string, string | undefined> = process.env): boolean {
  return env.MAIL_TRANSPORT === "outbox";
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string } | undefined;
}

export function smtpConfig(env: Record<string, string | undefined> = process.env): SmtpConfig {
  const host = env.SMTP_HOST || env.MAILHOG_HOST || "localhost";
  const port = Number(env.SMTP_PORT || env.MAILHOG_PORT || 1025);
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASS;
  return {
    host,
    port,
    // 465 = TLS desde el principio; 587 y 1025 = STARTTLS o nada (MailHog).
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  };
}

/** El remitente: "Temario <no-responder@temario.local>" si no se configura. */
export function fromAddress(organization?: string, env: Record<string, string | undefined> = process.env): string {
  const address = env.MAIL_FROM || "no-responder@temario.local";
  // El nombre que se ve es el de la plataforma; la dirección, la del sistema.
  const name = (organization || "Temario").replace(/["\\\r\n]/g, "");
  return `"${name}" <${address}>`;
}

let transporter: Transporter | undefined;

export function getTransport(): Transporter {
  transporter ??= nodemailer.createTransport({ ...smtpConfig(), pool: true, maxConnections: 2 });
  return transporter;
}

export interface OutgoingMail {
  to: string;
  subject: string;
  html: string;
  text: string;
  fromName?: string;
  headers?: Record<string, string>;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
}

export async function sendMail(mail: OutgoingMail): Promise<void> {
  if (isOutbox()) {
    const { collections } = await import("./db");
    const { outbox } = await collections();
    await outbox.insertOne({
      to: mail.to,
      from: fromAddress(mail.fromName),
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      attachments: (mail.attachments ?? []).map((a) => ({
        filename: a.filename,
        size: a.content.length,
        contentType: a.contentType,
      })),
      createdAt: new Date(),
    });
    return;
  }
  await getTransport().sendMail({
    from: fromAddress(mail.fromName),
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    headers: mail.headers,
    attachments: mail.attachments,
  });
}
