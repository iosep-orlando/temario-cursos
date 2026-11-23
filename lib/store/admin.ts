import { ObjectId } from "mongodb";
import { collections } from "../db";

export interface AdminStats {
  published: number;
  drafts: number;
  students: number;
  unanswered: number;
  unhelpful: number;
}

/** Los números del panel del admin. */
export async function adminStats(): Promise<AdminStats> {
  const { courses, users, feedback } = await collections();
  const [published, drafts, students, unanswered, unhelpful] = await Promise.all([
    courses.countDocuments({ published: true }),
    courses.countDocuments({ published: false }),
    users.countDocuments({ role: "student" }),
    feedback.countDocuments({ reply: null, text: { $ne: "" } }),
    feedback.countDocuments({ helpful: false }),
  ]);
  return { published, drafts, students, unanswered, unhelpful };
}

/** El título de cada recurso y su curso, para mostrar el feedback con contexto. */
export async function resourceTitles(ids: string[]): Promise<Map<string, { title: string; courseTitle: string; courseId: string }>> {
  const { resources, courses } = await collections();
  const list = await resources
    .find({ _id: { $in: [...new Set(ids)].filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id)) } }, { projection: { title: 1, courseId: 1 } })
    .toArray();
  const courseList = await courses.find({ _id: { $in: list.map((r) => r.courseId) } }, { projection: { title: 1 } }).toArray();
  return new Map(
    list.map((r) => [
      r._id.toString(),
      { title: r.title, courseId: r.courseId.toString(), courseTitle: courseList.find((c) => c._id.equals(r.courseId))?.title ?? "" },
    ]),
  );
}
