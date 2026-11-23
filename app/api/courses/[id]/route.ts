import { requireAdmin, requireUser } from "@/lib/auth";
import { ApiError, handle, readJson } from "@/lib/api";
import { deleteCourse, getCourseDoc, getOutline, updateCourse } from "@/lib/store/courses";
import { validateCourse } from "@/lib/validation";

type Ctx = RouteContext<"/api/courses/[id]">;

/** El curso con su índice (secciones y recursos, en orden). */
export const GET = handle(async (_request: Request, ctx: Ctx) => {
  const caller = await requireUser();
  return Response.json(await getOutline(await getCourseDoc(caller, { id: (await ctx.params).id })));
});

export const PUT = handle(async (request: Request, ctx: Ctx) => {
  await requireAdmin();
  const input = validateCourse(await readJson(request));
  if (!input.ok) throw new ApiError(400, input.error);
  return Response.json(await updateCourse((await ctx.params).id, input.value));
});

export const DELETE = handle(async (_request: Request, ctx: Ctx) => {
  await requireAdmin();
  await deleteCourse((await ctx.params).id);
  return new Response(null, { status: 204 });
});
