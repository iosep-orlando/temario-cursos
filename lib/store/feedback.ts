import type { Filter, ObjectId, WithId } from "mongodb";
import { ApiError } from "../api";
import { collections, feedbackToDTO, toObjectId, type FeedbackDoc, type ResourceDoc } from "../db";
import type { FeedbackInput } from "../validation";
import { rate } from "../course";
import type { FeedbackDTO } from "../types";

// ---------------------------------------------------------------------------
// Feedback: cada comentario va atado a un recurso (resourceId) y a quien lo
// escribió (userId). El alumno ve solo los suyos, con la respuesta del
// admin; el admin ve todos y sabe qué recursos funcionan peor.
// ---------------------------------------------------------------------------

async function withUsers(docs: WithId<FeedbackDoc>[]): Promise<FeedbackDTO[]> {
  const { users } = await collections();
  const ids = [...new Set(docs.map((d) => d.userId.toString()))].map((id) => toObjectId(id)!);
  const list = await users.find({ _id: { $in: ids } }, { projection: { email: 1, name: 1 } }).toArray();
  return docs.map((d) => {
    const user = list.find((u) => u._id.equals(d.userId));
    return feedbackToDTO(d, user ? { email: user.email, name: user.name } : null);
  });
}

export async function addFeedback(userId: ObjectId, resource: WithId<ResourceDoc>, input: FeedbackInput): Promise<FeedbackDTO> {
  const { feedback } = await collections();
  const doc: FeedbackDoc = {
    resourceId: resource._id,
    courseId: resource.courseId,
    userId,
    text: input.text,
    helpful: input.helpful,
    reply: null,
    createdAt: new Date(),
  };
  const { insertedId } = await feedback.insertOne(doc);
  return (await withUsers([{ _id: insertedId, ...doc }]))[0];
}

/** Lo que dejó este alumno en este recurso, del más nuevo al más viejo. */
export async function myFeedback(userId: ObjectId, resourceId: ObjectId): Promise<FeedbackDTO[]> {
  const { feedback } = await collections();
  return withUsers(await feedback.find({ userId, resourceId }).sort({ createdAt: -1 }).toArray());
}

export type FeedbackFilter = "all" | "unanswered" | "unhelpful";

/** Para el admin: todo el feedback, o el de un curso o recurso, con filtros. */
export async function listFeedback(opts: { resourceId?: ObjectId; courseId?: ObjectId; filter?: FeedbackFilter; limit?: number }): Promise<FeedbackDTO[]> {
  const { feedback } = await collections();
  const query: Filter<FeedbackDoc> = {};
  if (opts.resourceId) query.resourceId = opts.resourceId;
  if (opts.courseId) query.courseId = opts.courseId;
  // Sin responder: los que tienen comentario (un voto solo no se contesta).
  if (opts.filter === "unanswered") Object.assign(query, { reply: null, text: { $ne: "" } });
  if (opts.filter === "unhelpful") query.helpful = false;
  return withUsers(await feedback.find(query).sort({ createdAt: -1 }).limit(opts.limit ?? 200).toArray());
}

export async function replyFeedback(id: string, adminId: ObjectId, text: string): Promise<FeedbackDTO> {
  const _id = toObjectId(id);
  const { feedback } = await collections();
  const updated = _id
    ? await feedback.findOneAndUpdate(
        { _id },
        { $set: { reply: { text, repliedAt: new Date(), repliedBy: adminId } } },
        { returnDocument: "after" },
      )
    : null;
  if (!updated) throw new ApiError(404, "No existe ese comentario.");
  return (await withUsers([updated]))[0];
}

export async function deleteFeedback(id: string): Promise<void> {
  const _id = toObjectId(id);
  const { feedback } = await collections();
  const result = _id ? await feedback.deleteOne({ _id }) : { deletedCount: 0 };
  if (!result.deletedCount) throw new ApiError(404, "No existe ese comentario.");
}

export interface ResourceRating {
  resourceId: string;
  courseId: string;
  title: string;
  courseTitle: string;
  yes: number;
  no: number;
  comments: number;
}

/**
 * Los recursos con más "no me sirvió", primero los de peor proporción: lo
 * que el admin tendría que revisar.
 */
export async function worstRated(limit = 5): Promise<ResourceRating[]> {
  const { feedback, resources, courses } = await collections();
  const docs = await feedback.find({ helpful: false }, { projection: { resourceId: 1 } }).toArray();
  const flagged = [...new Set(docs.map((d) => d.resourceId.toString()))].map((id) => toObjectId(id)!);
  if (flagged.length === 0) return [];
  const all = await feedback.find({ resourceId: { $in: flagged } }, { projection: { resourceId: 1, helpful: 1, text: 1 } }).toArray();
  const ratings = rate(all);
  const resourceDocs = await resources.find({ _id: { $in: flagged } }, { projection: { title: 1, courseId: 1 } }).toArray();
  const courseDocs = await courses.find({ _id: { $in: resourceDocs.map((r) => r.courseId) } }, { projection: { title: 1 } }).toArray();
  return resourceDocs
    .map((r) => {
      const row = ratings.get(r._id.toString())!;
      return {
        resourceId: r._id.toString(),
        courseId: r.courseId.toString(),
        title: r.title,
        courseTitle: courseDocs.find((c) => c._id.equals(r.courseId))?.title ?? "",
        ...row,
      };
    })
    .sort((a, b) => b.no / (b.yes + b.no) - a.no / (a.yes + a.no) || b.no - a.no)
    .slice(0, limit);
}
