import type { Collection, Filter, ObjectId, WithId } from "mongodb";
import { ApiError } from "../api";
import {
  collections,
  courseToDTO,
  isDuplicateKey,
  resourceToDTO,
  resourceToSummary,
  sectionToDTO,
  toObjectId,
  type CourseDoc,
  type ResourceDoc,
  type SectionDoc,
} from "../db";
import type { CourseInput, Direction, ResourceInput } from "../validation";
import type { CourseDTO, CourseOutlineDTO, ResourceDTO, SectionDTO } from "../types";

// ---------------------------------------------------------------------------
// Cursos, secciones y recursos: la jerarquía y su orden.
//
// Secciones y recursos tienen `order`: un número que solo sirve para
// ordenar. Uno nuevo va al final (el más alto + 1); subir o bajar
// intercambia el número con el vecino. Al borrar quedan huecos (1, 2, 4):
// no importa, porque siempre se lista ordenado y en pantalla se numera
// 1, 2, 3.
// ---------------------------------------------------------------------------

/** Quién mira: un alumno solo ve cursos publicados; un admin, todos. */
export interface Viewer {
  role: "admin" | "student";
}

const DUP_SLUG = "Ya hay un curso con esa dirección. Elegí otra.";

// --- Cursos --------------------------------------------------------------------------

export interface CourseListItem extends CourseDTO {
  sections: number;
  resources: number;
}

export async function listCourses(viewer: Viewer): Promise<CourseListItem[]> {
  const { courses, sections, resources } = await collections();
  const filter: Filter<CourseDoc> = viewer.role === "admin" ? {} : { published: true };
  const list = await courses.find(filter).sort({ createdAt: 1 }).toArray();
  const ids = list.map((c) => c._id);
  const [sectionDocs, resourceDocs] = await Promise.all([
    sections.find({ courseId: { $in: ids } }, { projection: { courseId: 1 } }).toArray(),
    resources.find({ courseId: { $in: ids } }, { projection: { courseId: 1 } }).toArray(),
  ]);
  const count = (docs: { courseId: ObjectId }[], id: ObjectId) => docs.filter((d) => d.courseId.equals(id)).length;
  return list.map((c) => ({ ...courseToDTO(c), sections: count(sectionDocs, c._id), resources: count(resourceDocs, c._id) }));
}

/** El curso, si el que mira puede verlo. Un borrador, para un alumno, no existe (404). */
export async function getCourseDoc(viewer: Viewer, by: { id?: string; slug?: string }): Promise<WithId<CourseDoc>> {
  const { courses } = await collections();
  const _id = by.id !== undefined ? toObjectId(by.id) : undefined;
  if (by.id !== undefined && !_id) throw new ApiError(404, "No existe ese curso.");
  const course = await courses.findOne(_id ? { _id } : { slug: by.slug ?? "" });
  if (!course || (!course.published && viewer.role !== "admin")) throw new ApiError(404, "No existe ese curso.");
  return course;
}

export async function createCourse(input: CourseInput): Promise<CourseDTO> {
  const { courses } = await collections();
  const now = new Date();
  const doc: CourseDoc = { ...input, createdAt: now, updatedAt: now };
  try {
    const { insertedId } = await courses.insertOne(doc);
    return courseToDTO({ _id: insertedId, ...doc });
  } catch (error) {
    if (isDuplicateKey(error)) throw new ApiError(409, DUP_SLUG);
    throw error;
  }
}

export async function updateCourse(id: string, input: CourseInput): Promise<CourseDTO> {
  const current = await getCourseDoc({ role: "admin" }, { id });
  const { courses } = await collections();
  try {
    const updated = await courses.findOneAndUpdate(
      { _id: current._id },
      { $set: { ...input, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!updated) throw new ApiError(404, "No existe ese curso.");
    return courseToDTO(updated);
  } catch (error) {
    if (isDuplicateKey(error)) throw new ApiError(409, DUP_SLUG);
    throw error;
  }
}

/** Borra el curso con todo lo que cuelga de él: secciones, recursos, comentarios y avances. */
export async function deleteCourse(id: string): Promise<void> {
  const course = await getCourseDoc({ role: "admin" }, { id });
  const { courses, sections, resources, feedback, progress } = await collections();
  const courseId = course._id;
  await Promise.all([
    sections.deleteMany({ courseId }),
    resources.deleteMany({ courseId }),
    feedback.deleteMany({ courseId }),
    progress.deleteMany({ courseId }),
  ]);
  await courses.deleteOne({ _id: courseId });
}

// --- El índice del curso ---------------------------------------------------------------

/** El curso con sus secciones y, dentro de cada una, sus recursos: todo en orden. */
export async function getOutline(course: WithId<CourseDoc>): Promise<CourseOutlineDTO> {
  const { sections, resources } = await collections();
  const [sectionDocs, resourceDocs] = await Promise.all([
    sections.find({ courseId: course._id }).sort({ order: 1 }).toArray(),
    resources
      .find({ courseId: course._id }, { projection: { content: 0 } })
      .sort({ order: 1 })
      .toArray(),
  ]);
  return {
    course: courseToDTO(course),
    sections: sectionDocs.map((s) => ({
      ...sectionToDTO(s),
      resources: resourceDocs.filter((r) => r.sectionId.equals(s._id)).map((r) => resourceToSummary(r as WithId<ResourceDoc>)),
    })),
  };
}

// --- Orden -----------------------------------------------------------------------------

/** El próximo número de orden dentro de un grupo: el más alto + 1 (o 1 si está vacío). */
async function nextOrder<T extends { order: number }>(collection: Collection<T>, scope: Filter<T>): Promise<number> {
  const last = await collection.find(scope).sort({ order: -1 }).limit(1).next();
  return (last?.order ?? 0) + 1;
}

/**
 * Sube o baja un elemento dentro de su grupo intercambiando el `order` con
 * el vecino. Si ya es el primero (o el último), no hace nada.
 */
async function swap<T extends { order: number }>(
  collection: Collection<T>,
  item: WithId<T>,
  scope: Filter<T>,
  direction: Direction,
): Promise<boolean> {
  const neighbor = await collection
    .find({ ...scope, order: direction === "up" ? { $lt: item.order } : { $gt: item.order } } as Filter<T>)
    .sort({ order: direction === "up" ? -1 : 1 })
    .limit(1)
    .next();
  if (!neighbor) return false;
  await collection.updateOne({ _id: item._id } as Filter<T>, { $set: { order: neighbor.order } as Partial<T> });
  await collection.updateOne({ _id: neighbor._id } as Filter<T>, { $set: { order: item.order } as Partial<T> });
  return true;
}

// --- Secciones -------------------------------------------------------------------------

export async function getSectionDoc(id: string): Promise<WithId<SectionDoc>> {
  const _id = toObjectId(id);
  const { sections } = await collections();
  const section = _id ? await sections.findOne({ _id }) : null;
  if (!section) throw new ApiError(404, "No existe esa sección.");
  return section;
}

export async function createSection(courseId: string, title: string): Promise<SectionDTO> {
  const course = await getCourseDoc({ role: "admin" }, { id: courseId });
  const { sections } = await collections();
  const doc: SectionDoc = { courseId: course._id, title, order: await nextOrder(sections, { courseId: course._id }) };
  const { insertedId } = await sections.insertOne(doc);
  await touchCourse(course._id);
  return sectionToDTO({ _id: insertedId, ...doc });
}

export async function renameSection(id: string, title: string): Promise<SectionDTO> {
  const section = await getSectionDoc(id);
  const { sections } = await collections();
  await sections.updateOne({ _id: section._id }, { $set: { title } });
  await touchCourse(section.courseId);
  return sectionToDTO({ ...section, title });
}

/** Borra la sección con sus recursos, y los comentarios y avances de esos recursos. */
export async function deleteSection(id: string): Promise<void> {
  const section = await getSectionDoc(id);
  const { sections, resources, feedback, progress } = await collections();
  const ids = (await resources.find({ sectionId: section._id }, { projection: { _id: 1 } }).toArray()).map((r) => r._id);
  await Promise.all([
    feedback.deleteMany({ resourceId: { $in: ids } }),
    progress.deleteMany({ resourceId: { $in: ids } }),
    resources.deleteMany({ sectionId: section._id }),
  ]);
  await sections.deleteOne({ _id: section._id });
  await touchCourse(section.courseId);
}

export async function moveSection(id: string, direction: Direction): Promise<boolean> {
  const section = await getSectionDoc(id);
  const { sections } = await collections();
  const moved = await swap(sections, section, { courseId: section.courseId }, direction);
  if (moved) await touchCourse(section.courseId);
  return moved;
}

// --- Recursos --------------------------------------------------------------------------

export const NEW_RESOURCE_CONTENT = `Escribí acá el contenido en **Markdown**.

Para poner un video, pegá el enlace de YouTube solo en un renglón:

https://www.youtube.com/watch?v=hwP7WQkmECE
`;

export async function getResourceDoc(viewer: Viewer, id: string): Promise<WithId<ResourceDoc>> {
  const _id = toObjectId(id);
  const { resources, courses } = await collections();
  const resource = _id ? await resources.findOne({ _id }) : null;
  if (!resource) throw new ApiError(404, "No existe ese recurso.");
  // Un recurso de un curso no publicado, para un alumno, no existe.
  if (viewer.role !== "admin" && !(await courses.countDocuments({ _id: resource.courseId, published: true }, { limit: 1 }))) {
    throw new ApiError(404, "No existe ese recurso.");
  }
  return resource;
}

export async function getResource(viewer: Viewer, id: string): Promise<ResourceDTO> {
  return resourceToDTO(await getResourceDoc(viewer, id));
}

export async function createResource(sectionId: string, title: string): Promise<ResourceDTO> {
  const section = await getSectionDoc(sectionId);
  const { resources } = await collections();
  const now = new Date();
  const doc: ResourceDoc = {
    courseId: section.courseId,
    sectionId: section._id,
    title,
    order: await nextOrder(resources, { sectionId: section._id }),
    content: NEW_RESOURCE_CONTENT,
    createdAt: now,
    updatedAt: now,
  };
  const { insertedId } = await resources.insertOne(doc);
  await touchCourse(section.courseId);
  return resourceToDTO({ _id: insertedId, ...doc });
}

export async function updateResource(id: string, input: ResourceInput): Promise<ResourceDTO> {
  const resource = await getResourceDoc({ role: "admin" }, id);
  const { resources } = await collections();
  const updated = await resources.findOneAndUpdate(
    { _id: resource._id },
    { $set: { title: input.title, content: input.content, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!updated) throw new ApiError(404, "No existe ese recurso.");
  await touchCourse(resource.courseId);
  return resourceToDTO(updated);
}

export async function deleteResource(id: string): Promise<void> {
  const resource = await getResourceDoc({ role: "admin" }, id);
  const { resources, feedback, progress } = await collections();
  await Promise.all([feedback.deleteMany({ resourceId: resource._id }), progress.deleteMany({ resourceId: resource._id })]);
  await resources.deleteOne({ _id: resource._id });
  await touchCourse(resource.courseId);
}

export async function moveResource(id: string, direction: Direction): Promise<boolean> {
  const resource = await getResourceDoc({ role: "admin" }, id);
  const { resources } = await collections();
  const moved = await swap(resources, resource, { sectionId: resource.sectionId }, direction);
  if (moved) await touchCourse(resource.courseId);
  return moved;
}

/** "Modificado el…" del curso refleja también los cambios en su contenido. */
async function touchCourse(courseId: ObjectId): Promise<void> {
  const { courses } = await collections();
  await courses.updateOne({ _id: courseId }, { $set: { updatedAt: new Date() } });
}
