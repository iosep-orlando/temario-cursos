import { requireAdmin } from "@/lib/auth";
import { ApiError, handle, readJson } from "@/lib/api";
import { moveSection } from "@/lib/store/courses";
import { validateDirection } from "@/lib/validation";

/** { direction: "up" | "down" }: intercambia el orden con la sección vecina. */
export const POST = handle(async (request: Request, ctx: RouteContext<"/api/sections/[id]/move">) => {
  await requireAdmin();
  const direction = validateDirection((await readJson(request)).direction);
  if (!direction.ok) throw new ApiError(400, direction.error);
  return Response.json({ moved: await moveSection((await ctx.params).id, direction.value) });
});
