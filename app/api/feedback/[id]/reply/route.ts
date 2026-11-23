import { requireAdmin } from "@/lib/auth";
import { ApiError, handle, readJson } from "@/lib/api";
import { replyFeedback } from "@/lib/store/feedback";
import { validateReply } from "@/lib/validation";

/** La respuesta del admin: el alumno la ve debajo de su comentario. */
export const PUT = handle(async (request: Request, ctx: RouteContext<"/api/feedback/[id]/reply">) => {
  const caller = await requireAdmin();
  const text = validateReply((await readJson(request)).text);
  if (!text.ok) throw new ApiError(400, text.error);
  return Response.json(await replyFeedback((await ctx.params).id, caller.userId, text.value));
});
