import { afterEach, describe, expect, it, vi } from "vitest";

// El envío sin servidor de correo ni base: Nodemailer y la colección
// outbox se sustituyen por espías.
const sendMailSpy = vi.fn(async () => ({}));
const createTransport = vi.fn(() => ({ sendMail: sendMailSpy }));
vi.mock("nodemailer", () => ({ default: { createTransport } }));
const insertOne = vi.fn(async () => ({}));
vi.mock("@/lib/db", () => ({ collections: async () => ({ outbox: { insertOne } }) }));

const { sendMail } = await import("@/lib/mail");

const mail = {
  to: "ana@b.com",
  subject: "Factura A 0001-00000042 de Tostadero",
  html: "<p>Hola</p>",
  text: "Hola",
  fromName: "Tostadero",
  attachments: [{ filename: "Factura-A-0001-00000042.pdf", content: Buffer.from("%PDF"), contentType: "application/pdf" }],
};

describe("sendMail", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("por SMTP (MailHog en local): una sola conexión reutilizada", async () => {
    await sendMail(mail);
    await sendMail(mail);
    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ host: "localhost", port: 1025, pool: true }));
    expect(sendMailSpy).toHaveBeenCalledWith(
      expect.objectContaining({ to: "ana@b.com", from: '"Tostadero" <no-responder@temario.local>', attachments: mail.attachments }),
    );
    expect(insertOne).not.toHaveBeenCalled();
  });

  it("en la demo (outbox): se guarda en la bandeja y no sale nada", async () => {
    vi.stubEnv("MAIL_TRANSPORT", "outbox");
    await sendMail(mail);
    expect(sendMailSpy).not.toHaveBeenCalled();
    expect(insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ana@b.com",
        attachments: [{ filename: "Factura-A-0001-00000042.pdf", size: 4, contentType: "application/pdf" }],
      }),
    );
  });
});
