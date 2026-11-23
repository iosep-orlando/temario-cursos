import { requireAdmin, requireUser } from "@/lib/auth";
import { ApiError, handle, readJson } from "@/lib/api";
import { createCourse, listCourses } from "@/lib/store/courses";
import { validateCourse } from "@/lib/validation";

/** Un alumno ve los cursos publicados; un admin, todos. */
export const GET = handle(async () => {
  const caller = await requireUser();
  return Response.json({ courses: await listCourses(caller) });
});

export const POST = handle(async (request: Request) => {
  await requireAdmin();
  const input = validateCourse(await readJson(request));
  if (!input.ok) throw new ApiError(400, input.error);
  return Response.json(await createCourse(input.value), { status: 201 });
});
