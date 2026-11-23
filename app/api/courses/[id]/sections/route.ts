import { requireAdmin } from "@/lib/auth";
import { ApiError, handle, readJson } from "@/lib/api";
import { createSection } from "@/lib/store/courses";
import { validateTitle } from "@/lib/validation";

/** Una sección nueva, al final del curso. */
export const POST = handle(async (request: Request, ctx: RouteContext<"/api/courses/[id]/sections">) => {
  await requireAdmin();
  const title = validateTitle((await readJson(request)).title, "sección");
  if (!title.ok) throw new ApiError(400, title.error);
  return Response.json(await createSection((await ctx.params).id, title.value), { status: 201 });
});
