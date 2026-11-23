import { requireAdmin } from "@/lib/auth";
import { ApiError, handle, readJson } from "@/lib/api";
import { moveResource } from "@/lib/store/courses";
import { validateDirection } from "@/lib/validation";

/** { direction: "up" | "down" }: intercambia el orden con el recurso vecino de su sección. */
export const POST = handle(async (request: Request, ctx: RouteContext<"/api/resources/[id]/move">) => {
  await requireAdmin();
  const direction = validateDirection((await readJson(request)).direction);
  if (!direction.ok) throw new ApiError(400, direction.error);
  return Response.json({ moved: await moveResource((await ctx.params).id, direction.value) });
});
