import { requireAdmin } from "@/lib/auth";
import { handle } from "@/lib/api";
import { deleteFeedback } from "@/lib/store/feedback";

/** El admin puede borrar un comentario (spam, o algo que no corresponde). */
export const DELETE = handle(async (_request: Request, ctx: RouteContext<"/api/feedback/[id]">) => {
  await requireAdmin();
  await deleteFeedback((await ctx.params).id);
  return new Response(null, { status: 204 });
});
