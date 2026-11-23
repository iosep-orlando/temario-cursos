import { ApiError, handle } from "@/lib/api";
import { collections, toObjectId } from "@/lib/db";
import { isOutbox } from "@/lib/mail";

/**
 * Un mail de la bandeja, como HTML para el visor. Los enlaces abren en la
 * pestaña de arriba (base target=_top): así el enlace para entrar funciona.
 */
export const GET = handle(async (_request: Request, ctx: RouteContext<"/api/outbox/[id]">) => {
  if (!isOutbox()) throw new ApiError(404, "No hay bandeja de demo.");
  const _id = toObjectId((await ctx.params).id);
  const { outbox } = await collections();
  const mail = _id ? await outbox.findOne({ _id }) : null;
  if (!mail) throw new ApiError(404, "No existe ese mail.");
  return new Response(`<!doctype html><meta charset="utf-8"><base target="_top">${mail.html}`, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      // El HTML del mail no ejecuta scripts ni lee nada de la app.
      "content-security-policy": "default-src 'none'; img-src * data:; style-src 'unsafe-inline'; sandbox allow-popups allow-top-navigation-by-user-activation",
    },
  });
});
