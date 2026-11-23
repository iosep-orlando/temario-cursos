import { describe, expect, it } from "vitest";
import {
  MAX_CONTENT,
  normalizeEmail,
  slugify,
  validateCourse,
  validateDirection,
  validateEmail,
  validateFeedback,
  validateReply,
  validateResource,
  validateTitle,
} from "@/lib/validation";

describe("slug a partir del título", () => {
  it.each([
    ["Git desde cero", "git-desde-cero"],
    ["Next.js con App Router", "next-js-con-app-router"],
    ["  ¿Qué es MongoDB?  ", "que-es-mongodb"],
    ["Programación en C++ (2.ª edición)", "programacion-en-c-2-edicion"],
    ["Ñandú", "nandu"],
    ["!!!", ""],
  ])("%j → %j", (title, slug) => {
    expect(slugify(title)).toBe(slug);
  });
  it("corta a 80 sin dejar un guion al final", () => {
    const slug = slugify("palabra ".repeat(30));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("curso", () => {
  it("válido, con slug automático y publicado solo si es true", () => {
    expect(validateCourse({ title: "Git desde cero", description: " Desc ", published: "sí" })).toEqual({
      ok: true,
      value: { title: "Git desde cero", slug: "git-desde-cero", description: "Desc", published: false },
    });
    expect(validateCourse({ title: "X", slug: "mi-curso", published: true })).toMatchObject({ ok: true, value: { slug: "mi-curso", published: true } });
  });
  it.each([
    [{ title: "" }, "Falta el título del curso."],
    [{ title: "x".repeat(121) }, "El título puede tener hasta 120 caracteres."],
    [{ title: "Ok", slug: "Con Mayúsculas" }, "La dirección solo puede tener minúsculas, números y guiones (por ejemplo, git-desde-cero)."],
    [{ title: "Ok", slug: "doble--guion" }, "La dirección solo puede tener minúsculas, números y guiones (por ejemplo, git-desde-cero)."],
    [{ title: "!!!" }, "La dirección solo puede tener minúsculas, números y guiones (por ejemplo, git-desde-cero)."],
    [{ title: "Ok", description: "x".repeat(1001) }, "La descripción puede tener hasta 1000 caracteres."],
  ])("rechaza %j", (body, error) => {
    expect(validateCourse(body)).toEqual({ ok: false, error });
  });
});

describe("secciones y recursos", () => {
  it("títulos", () => {
    expect(validateTitle(" Ramas ", "sección")).toEqual({ ok: true, value: "Ramas" });
    expect(validateTitle("", "sección")).toEqual({ ok: false, error: "Falta el título de la sección." });
    expect(validateTitle(null, "recurso")).toEqual({ ok: false, error: "Falta el título del recurso." });
    expect(validateTitle("x".repeat(151), "recurso").ok).toBe(false);
  });
  it("recurso: el contenido se guarda tal cual (con finales de línea de Unix)", () => {
    expect(validateResource({ title: "Hola", content: "# Hola\r\n\r\nmundo  " })).toEqual({ ok: true, value: { title: "Hola", content: "# Hola\n\nmundo  " } });
    expect(validateResource({ title: "Vacío" })).toEqual({ ok: true, value: { title: "Vacío", content: "" } });
    expect(validateResource({ title: "Largo", content: "x".repeat(MAX_CONTENT + 1) }).ok).toBe(false);
    expect(validateResource({ title: "" }).ok).toBe(false);
  });
  it("dirección para ordenar", () => {
    expect(validateDirection("up")).toEqual({ ok: true, value: "up" });
    expect(validateDirection("down")).toEqual({ ok: true, value: "down" });
    expect(validateDirection("left").ok).toBe(false);
  });
});

describe("feedback", () => {
  it("comentario, voto, o las dos cosas", () => {
    expect(validateFeedback({ text: " Bien ", helpful: true })).toEqual({ ok: true, value: { text: "Bien", helpful: true } });
    expect(validateFeedback({ helpful: false })).toEqual({ ok: true, value: { text: "", helpful: false } });
    expect(validateFeedback({ text: "Solo texto" })).toEqual({ ok: true, value: { text: "Solo texto", helpful: null } });
    expect(validateFeedback({ text: "Con null", helpful: null })).toEqual({ ok: true, value: { text: "Con null", helpful: null } });
  });
  it("rechaza", () => {
    expect(validateFeedback({})).toEqual({ ok: false, error: "Escribí un comentario o respondé si te sirvió." });
    expect(validateFeedback({ text: "  " })).toEqual({ ok: false, error: "Escribí un comentario o respondé si te sirvió." });
    expect(validateFeedback({ text: "x", helpful: "sí" })).toEqual({ ok: false, error: "«¿Te sirvió?» es sí o no." });
    expect(validateFeedback({ text: "x".repeat(2001) }).ok).toBe(false);
  });
  it("respuesta del admin", () => {
    expect(validateReply(" Gracias ")).toEqual({ ok: true, value: "Gracias" });
    expect(validateReply("").ok).toBe(false);
    expect(validateReply("x".repeat(2001)).ok).toBe(false);
  });
});

describe("email", () => {
  it("normaliza y valida", () => {
    expect(normalizeEmail(" Ana@Temario.TEST ")).toBe("ana@temario.test");
    expect(validateEmail("ana@temario.test").ok).toBe(true);
    expect(validateEmail("ana@temario").ok).toBe(false);
    expect(validateEmail(undefined).ok).toBe(false);
  });
});
