import { requireAdmin } from "@/lib/auth";
import { ApiError, handle, readJson } from "@/lib/api";
import { deleteSection, renameSection } from "@/lib/store/courses";
import { validateTitle } from "@/lib/validation";

type Ctx = RouteContext<"/api/sections/[id]">;

export const PUT = handle(async (request: Request, ctx: Ctx) => {
  await requireAdmin();
  const title = validateTitle((await readJson(request)).title, "sección");
  if (!title.ok) throw new ApiError(400, title.error);
  return Response.json(await renameSection((await ctx.params).id, title.value));
});

/** Borra la sección con sus recursos. */
export const DELETE = handle(async (_request: Request, ctx: Ctx) => {
  await requireAdmin();
  await deleteSection((await ctx.params).id);
  return new Response(null, { status: 204 });
});
