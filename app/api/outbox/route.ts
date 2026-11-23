import { ApiError, handle } from "@/lib/api";
import { collections } from "@/lib/db";
import { isOutbox } from "@/lib/mail";
import { normalizeEmail } from "@/lib/validation";

/**
 * La bandeja de demo: los últimos mails "enviados" a un email (?para=).
 * Solo existe con MAIL_TRANSPORT=outbox; con correo de verdad, 404.
 */
export const GET = handle(async (request: Request) => {
  if (!isOutbox()) throw new ApiError(404, "No hay bandeja de demo.");
  const to = normalizeEmail(new URL(request.url).searchParams.get("para"));
  if (!to) return Response.json({ mails: [] });
  const { outbox } = await collections();
  const list = await outbox.find({ to }).sort({ createdAt: -1 }).limit(30).toArray();
  return Response.json({
    mails: list.map((m) => ({
      id: m._id.toString(),
      from: m.from,
      subject: m.subject,
      attachments: m.attachments,
      createdAt: m.createdAt.toISOString(),
    })),
  });
});
