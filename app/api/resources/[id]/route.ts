import { requireAdmin, requireUser } from "@/lib/auth";
import { ApiError, handle, readJson } from "@/lib/api";
import { deleteResource, getResource, updateResource } from "@/lib/store/courses";
import { validateResource } from "@/lib/validation";

type Ctx = RouteContext<"/api/resources/[id]">;

/** Un alumno solo ve recursos de cursos publicados. */
export const GET = handle(async (_request: Request, ctx: Ctx) => {
  const caller = await requireUser();
  return Response.json(await getResource(caller, (await ctx.params).id));
});

export const PUT = handle(async (request: Request, ctx: Ctx) => {
  await requireAdmin();
  const input = validateResource(await readJson(request));
  if (!input.ok) throw new ApiError(400, input.error);
  return Response.json(await updateResource((await ctx.params).id, input.value));
});

export const DELETE = handle(async (_request: Request, ctx: Ctx) => {
  await requireAdmin();
  await deleteResource((await ctx.params).id);
  return new Response(null, { status: 204 });
});
