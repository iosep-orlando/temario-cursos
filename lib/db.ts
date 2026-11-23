import { MongoClient, ObjectId, type Db, type WithId } from "mongodb";
import type { CourseDTO, FeedbackDTO, FileDTO, Helpful, ResourceDTO, ResourceSummaryDTO, Role, SectionDTO } from "./types";

// ---------------------------------------------------------------------------
// MongoDB: UN cliente por proceso (singleton), las colecciones y sus índices.
// Ninguna ruta crea su propio MongoClient: todas pasan por collections().
// ---------------------------------------------------------------------------

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Falta la variable de entorno "MONGODB_URI"');
  // En globalThis: en desarrollo la recarga en caliente vuelve a ejecutar
  // los módulos, y sin esto abriría una conexión nueva en cada cambio.
  global._mongoClientPromise ??= new MongoClient(uri).connect();
  return global._mongoClientPromise;
}

/** MONGODB_DB, si no el nombre de la URI, si no "saas-cursos". */
export function databaseName(uri: string | undefined, explicit: string | undefined): string {
  if (explicit) return explicit;
  const match = uri?.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : "saas-cursos";
}

export async function getDb(): Promise<Db> {
  return (await getClient()).db(databaseName(process.env.MONGODB_URI, process.env.MONGODB_DB));
}

/** Para los scripts: cierra la conexión y deja terminar el proceso. */
export async function closeDb(): Promise<void> {
  const client = await global._mongoClientPromise;
  await client?.close();
  global._mongoClientPromise = undefined;
}

// --- Documentos --------------------------------------------------------------

export interface UserDoc {
  email: string;
  name: string;
  /** Se recalcula en cada ingreso con ADMIN_EMAILS (lib/roles.ts). */
  role: Role;
  createdAt: Date;
}

export interface LoginTokenDoc {
  /** Solo el hash: si alguien lee la base, no puede entrar con los enlaces. */
  tokenHash: string;
  email: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface CourseDoc {
  title: string;
  slug: string;
  description: string;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SectionDoc {
  courseId: ObjectId;
  title: string;
  order: number;
}

export interface ResourceDoc {
  courseId: ObjectId;
  sectionId: ObjectId;
  title: string;
  order: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedbackDoc {
  resourceId: ObjectId;
  courseId: ObjectId;
  userId: ObjectId;
  text: string;
  helpful: Helpful;
  reply: { text: string; repliedAt: Date; repliedBy: ObjectId } | null;
  createdAt: Date;
}

/** Un recurso marcado como visto por un alumno. */
export interface ProgressDoc {
  userId: ObjectId;
  courseId: ObjectId;
  resourceId: ObjectId;
  completedAt: Date;
}

/** Un archivo subido (el contenido vive en el bucket S3, en files/<id>). */
export interface FileDoc {
  filename: string;
  contentType: string;
  size: number;
  key: string;
  uploadedBy: ObjectId;
  createdAt: Date;
}

/** Un mail guardado en la bandeja de demo (MAIL_TRANSPORT=outbox) en vez de enviarse. */
export interface OutboxDoc {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  attachments: { filename: string; size: number; contentType: string }[];
  createdAt: Date;
}

let indexes: Promise<unknown> | undefined;

export async function collections() {
  const db = await getDb();
  const c = {
    users: db.collection<UserDoc>("users"),
    loginTokens: db.collection<LoginTokenDoc>("loginTokens"),
    courses: db.collection<CourseDoc>("courses"),
    sections: db.collection<SectionDoc>("sections"),
    resources: db.collection<ResourceDoc>("resources"),
    feedback: db.collection<FeedbackDoc>("feedback"),
    progress: db.collection<ProgressDoc>("progress"),
    files: db.collection<FileDoc>("files"),
    outbox: db.collection<OutboxDoc>("outbox"),
  };
  indexes ??= Promise.all([
    c.users.createIndex({ email: 1 }, { unique: true }),
    c.loginTokens.createIndex({ tokenHash: 1 }, { unique: true }),
    c.loginTokens.createIndex({ email: 1, createdAt: -1 }),
    // MongoDB borra solo los enlaces vencidos (índice TTL).
    c.loginTokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    c.courses.createIndex({ slug: 1 }, { unique: true }),
    // Las consultas de siempre: las secciones de un curso y los recursos de
    // una sección, en orden.
    c.sections.createIndex({ courseId: 1, order: 1 }),
    c.resources.createIndex({ sectionId: 1, order: 1 }),
    c.resources.createIndex({ courseId: 1 }),
    c.feedback.createIndex({ resourceId: 1, createdAt: -1 }),
    c.feedback.createIndex({ courseId: 1, createdAt: -1 }),
    c.feedback.createIndex({ userId: 1, resourceId: 1 }),
    // Un "visto" por alumno y recurso, aunque se marque dos veces.
    c.progress.createIndex({ userId: 1, resourceId: 1 }, { unique: true }),
    c.progress.createIndex({ userId: 1, courseId: 1 }),
    c.files.createIndex({ createdAt: -1 }),
    // La bandeja de demo se vacía sola: cada mail dura 3 días.
    c.outbox.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3 * 24 * 60 * 60 }),
    c.outbox.createIndex({ to: 1, createdAt: -1 }),
  ]);
  await indexes;
  return c;
}

export type Collections = Awaited<ReturnType<typeof collections>>;

/** ObjectId de un texto, o null si no es un id válido (evita un 500 con ids basura). */
export function toObjectId(id: unknown): ObjectId | null {
  return typeof id === "string" && ObjectId.isValid(id) && String(new ObjectId(id)) === id ? new ObjectId(id) : null;
}

/** Error de índice único (código 11000): un slug repetido, por ejemplo. */
export function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

// --- Documento → DTO -------------------------------------------------------------

export function courseToDTO(doc: WithId<CourseDoc>): CourseDTO {
  return {
    id: doc._id.toString(),
    title: doc.title,
    slug: doc.slug,
    description: doc.description,
    published: doc.published,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function sectionToDTO(doc: WithId<SectionDoc>): SectionDTO {
  return { id: doc._id.toString(), courseId: doc.courseId.toString(), title: doc.title, order: doc.order };
}

export function resourceToSummary(doc: WithId<Pick<ResourceDoc, "sectionId" | "courseId" | "title" | "order">>): ResourceSummaryDTO {
  return {
    id: doc._id.toString(),
    sectionId: doc.sectionId.toString(),
    courseId: doc.courseId.toString(),
    title: doc.title,
    order: doc.order,
  };
}

export function resourceToDTO(doc: WithId<ResourceDoc>): ResourceDTO {
  return { ...resourceToSummary(doc), content: doc.content, updatedAt: doc.updatedAt.toISOString() };
}

export function feedbackToDTO(doc: WithId<FeedbackDoc>, user: { email: string; name: string } | null): FeedbackDTO {
  return {
    id: doc._id.toString(),
    resourceId: doc.resourceId.toString(),
    courseId: doc.courseId.toString(),
    userId: doc.userId.toString(),
    userEmail: user?.email ?? "",
    userName: user?.name ?? "Cuenta borrada",
    text: doc.text,
    helpful: doc.helpful,
    reply: doc.reply ? { text: doc.reply.text, repliedAt: doc.reply.repliedAt.toISOString() } : null,
    createdAt: doc.createdAt.toISOString(),
  };
}

export function fileToDTO(doc: WithId<FileDoc>): FileDTO {
  return {
    id: doc._id.toString(),
    filename: doc.filename,
    contentType: doc.contentType,
    size: doc.size,
    url: fileUrl(doc._id.toString(), doc.filename),
    createdAt: doc.createdAt.toISOString(),
  };
}

/** La URL con que el Markdown enlaza un archivo: /api/files/<id>/<nombre>. */
export function fileUrl(id: string, filename: string): string {
  return `/api/files/${id}/${encodeURIComponent(filename)}`;
}
