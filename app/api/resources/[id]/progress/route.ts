import { requireUser } from "@/lib/auth";
import { handle, readJson } from "@/lib/api";
import { getOutline, getCourseDoc, getResourceDoc } from "@/lib/store/courses";
import { computeProgress } from "@/lib/course";
import { completedIn, setDone } from "@/lib/store/progress";

/** { done: true | false }: marcar o desmarcar el recurso como visto. Devuelve el avance del curso. */
export const POST = handle(async (request: Request, ctx: RouteContext<"/api/resources/[id]/progress">) => {
  const caller = await requireUser();
  const resource = await getResourceDoc(caller, (await ctx.params).id);
  const body = await readJson(request);
  await setDone(caller.userId, resource, body.done !== false);
  const outline = await getOutline(await getCourseDoc(caller, { id: resource.courseId.toString() }));
  return Response.json(computeProgress(outline, await completedIn(caller.userId, resource.courseId)));
});
