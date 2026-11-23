import type { Helpful } from "./types";

// ---------------------------------------------------------------------------
// Validación de todo lo que llega del navegador. El navegador también
// valida, para avisar antes, pero la que vale es esta.
// ---------------------------------------------------------------------------

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = <T>(error: string): Result<T> => ({ ok: false, error });

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

// --- Email ------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/;

export function normalizeEmail(value: unknown): string {
  return text(value).toLowerCase();
}

export function validateEmail(value: unknown): Result<string> {
  const email = normalizeEmail(value);
  if (!EMAIL_RE.test(email) || email.length > 254) return fail("Ese email no parece válido.");
  return ok(email);
}

// --- Cursos ------------------------------------------------------------------------

/**
 * La dirección del curso a partir del título: "Next.js con App Router" →
 * "nextjs-con-app-router". Sin tildes, en minúsculas, con guiones.
 */
export function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface CourseInput {
  title: string;
  slug: string;
  description: string;
  published: boolean;
}

export function validateCourse(body: Record<string, unknown>): Result<CourseInput> {
  const title = text(body.title);
  if (!title) return fail("Falta el título del curso.");
  if (title.length > 120) return fail("El título puede tener hasta 120 caracteres.");
  const slug = text(body.slug) || slugify(title);
  if (!SLUG_RE.test(slug) || slug.length > 80) {
    return fail("La dirección solo puede tener minúsculas, números y guiones (por ejemplo, git-desde-cero).");
  }
  const description = text(body.description);
  if (description.length > 1000) return fail("La descripción puede tener hasta 1000 caracteres.");
  return ok({ title, slug, description, published: body.published === true });
}

// --- Secciones y recursos --------------------------------------------------------------

export function validateTitle(value: unknown, what: "sección" | "recurso"): Result<string> {
  const title = text(value);
  if (!title) return fail(what === "sección" ? "Falta el título de la sección." : "Falta el título del recurso.");
  if (title.length > 150) return fail("El título puede tener hasta 150 caracteres.");
  return ok(title);
}

/** Unas 30 páginas de texto: de sobra para un recurso, y frena un pegado accidental enorme. */
export const MAX_CONTENT = 100_000;

export interface ResourceInput {
  title: string;
  content: string;
}

export function validateResource(body: Record<string, unknown>): Result<ResourceInput> {
  const title = validateTitle(body.title, "recurso");
  if (!title.ok) return title;
  const content = typeof body.content === "string" ? body.content.replace(/\r\n/g, "\n") : "";
  if (content.length > MAX_CONTENT) return fail("El contenido es demasiado largo (hasta 100.000 caracteres).");
  return ok({ title: title.value, content });
}

export type Direction = "up" | "down";

export function validateDirection(value: unknown): Result<Direction> {
  return value === "up" || value === "down" ? ok(value) : fail('La dirección es "up" o "down".');
}

// --- Feedback ----------------------------------------------------------------------------

export interface FeedbackInput {
  text: string;
  helpful: Helpful;
}

/** Un comentario, un "¿te sirvió?", o las dos cosas. Al menos una. */
export function validateFeedback(body: Record<string, unknown>): Result<FeedbackInput> {
  const comment = text(body.text);
  if (comment.length > 2000) return fail("El comentario puede tener hasta 2000 caracteres.");
  const helpful = body.helpful === true ? true : body.helpful === false ? false : null;
  if (body.helpful !== undefined && body.helpful !== null && typeof body.helpful !== "boolean") {
    return fail("«¿Te sirvió?» es sí o no.");
  }
  if (!comment && helpful === null) return fail("Escribí un comentario o respondé si te sirvió.");
  return ok({ text: comment, helpful });
}

export function validateReply(value: unknown): Result<string> {
  const reply = text(value);
  if (!reply) return fail("Escribí la respuesta.");
  if (reply.length > 2000) return fail("La respuesta puede tener hasta 2000 caracteres.");
  return ok(reply);
}
