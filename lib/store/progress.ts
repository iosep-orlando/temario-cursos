import type { ObjectId, WithId } from "mongodb";
import { collections, type ResourceDoc } from "../db";

// ---------------------------------------------------------------------------
// El avance de cada alumno: qué recursos marcó como vistos.
// ---------------------------------------------------------------------------

export async function completedIn(userId: ObjectId, courseId: ObjectId): Promise<Set<string>> {
  const { progress } = await collections();
  const docs = await progress.find({ userId, courseId }, { projection: { resourceId: 1 } }).toArray();
  return new Set(docs.map((d) => d.resourceId.toString()));
}

/** Los recursos vistos por un alumno, agrupados por curso (para la lista de cursos). */
export async function completedByCourse(userId: ObjectId): Promise<Map<string, Set<string>>> {
  const { progress } = await collections();
  const docs = await progress.find({ userId }, { projection: { courseId: 1, resourceId: 1 } }).toArray();
  const map = new Map<string, Set<string>>();
  for (const d of docs) {
    const key = d.courseId.toString();
    if (!map.has(key)) map.set(key, new Set());
    map.get(key)!.add(d.resourceId.toString());
  }
  return map;
}

/** Marca o desmarca un recurso como visto. Marcar dos veces no duplica (upsert con índice único). */
export async function setDone(userId: ObjectId, resource: WithId<ResourceDoc>, done: boolean): Promise<void> {
  const { progress } = await collections();
  if (done) {
    await progress.updateOne(
      { userId, resourceId: resource._id },
      { $setOnInsert: { userId, resourceId: resource._id, courseId: resource.courseId, completedAt: new Date() } },
      { upsert: true },
    );
  } else {
    await progress.deleteOne({ userId, resourceId: resource._id });
  }
}
