import { requireAdmin } from "@/lib/auth";
import { ApiError, handle, readJson } from "@/lib/api";
import { createResource } from "@/lib/store/courses";
import { validateTitle } from "@/lib/validation";

/** Un recurso nuevo, al final de la sección, con un contenido de ejemplo. */
export const POST = handle(async (request: Request, ctx: RouteContext<"/api/sections/[id]/resources">) => {
  await requireAdmin();
  const title = validateTitle((await readJson(request)).title, "recurso");
  if (!title.ok) throw new ApiError(400, title.error);
  return Response.json(await createResource((await ctx.params).id, title.value), { status: 201 });
});
