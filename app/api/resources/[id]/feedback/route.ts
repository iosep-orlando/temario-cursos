import { requireUser } from "@/lib/auth";
import { ApiError, handle, readJson } from "@/lib/api";
import { getResourceDoc } from "@/lib/store/courses";
import { addFeedback, listFeedback, myFeedback } from "@/lib/store/feedback";
import { validateFeedback } from "@/lib/validation";

type Ctx = RouteContext<"/api/resources/[id]/feedback">;

/** El alumno ve lo suyo; el admin, todo lo del recurso. */
export const GET = handle(async (_request: Request, ctx: Ctx) => {
  const caller = await requireUser();
  const resource = await getResourceDoc(caller, (await ctx.params).id);
  const feedback =
    caller.role === "admin" ? await listFeedback({ resourceId: resource._id }) : await myFeedback(caller.userId, resource._id);
  return Response.json({ feedback });
});

/** Dejar un comentario y/o "¿te sirvió?". El userId sale de la sesión. */
export const POST = handle(async (request: Request, ctx: Ctx) => {
  const caller = await requireUser();
  const resource = await getResourceDoc(caller, (await ctx.params).id);
  const input = validateFeedback(await readJson(request));
  if (!input.ok) throw new ApiError(400, input.error);
  return Response.json(await addFeedback(caller.userId, resource, input.value), { status: 201 });
});
