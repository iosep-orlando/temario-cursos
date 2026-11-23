import { describe, expect, it } from "vitest";
import { computeProgress, flatten, neighbors, rate } from "@/lib/course";
import type { CourseOutlineDTO } from "@/lib/types";

const r = (id: string, sectionId: string, order: number) => ({ id, sectionId, courseId: "c", title: `Recurso ${id}`, order });
const outline: CourseOutlineDTO = {
  course: { id: "c", title: "Git", slug: "git", description: "", published: true, createdAt: "", updatedAt: "" },
  sections: [
    { id: "s1", courseId: "c", title: "Uno", order: 1, resources: [r("a", "s1", 1), r("b", "s1", 2)] },
    { id: "s2", courseId: "c", title: "Vacía", order: 3, resources: [] },
    { id: "s3", courseId: "c", title: "Tres", order: 7, resources: [r("c", "s3", 1)] },
  ],
};

describe("el recorrido del curso", () => {
  it("en orden, sección por sección (saltando las vacías)", () => {
    expect(flatten(outline).map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
  it("anterior y siguiente cruzando secciones", () => {
    expect(neighbors(outline, "a")).toMatchObject({ index: 0, total: 3, prev: null, next: { id: "b" } });
    expect(neighbors(outline, "b")).toMatchObject({ prev: { id: "a" }, next: { id: "c" } });
    expect(neighbors(outline, "c")).toMatchObject({ prev: { id: "b" }, next: null });
    expect(neighbors(outline, "x")).toMatchObject({ index: -1, prev: null, next: null });
  });
});

describe("avance", () => {
  it("sin ver nada: 0 % y el primero es el próximo", () => {
    expect(computeProgress(outline, new Set())).toEqual({ done: 0, total: 3, percent: 0, completed: [], nextResourceId: "a" });
  });
  it("el próximo es el primero que falta, aunque haya vistos más adelante", () => {
    expect(computeProgress(outline, new Set(["a", "c"]))).toEqual({ done: 2, total: 3, percent: 67, completed: ["a", "c"], nextResourceId: "b" });
  });
  it("todo visto: 100 % y nada pendiente", () => {
    expect(computeProgress(outline, new Set(["a", "b", "c"]))).toMatchObject({ percent: 100, nextResourceId: null });
  });
  it("lo visto de un recurso que ya no existe no cuenta", () => {
    expect(computeProgress(outline, new Set(["a", "borrado"]))).toMatchObject({ done: 1, completed: ["a"] });
  });
  it("un curso vacío", () => {
    const empty = { ...outline, sections: [] };
    expect(computeProgress(empty, new Set())).toEqual({ done: 0, total: 0, percent: 0, completed: [], nextResourceId: null });
  });
});

describe("valoraciones por recurso", () => {
  it("cuenta sí, no y comentarios", () => {
    const map = rate([
      { resourceId: "a", helpful: true, text: "" },
      { resourceId: "a", helpful: false, text: "No anduvo" },
      { resourceId: "a", helpful: null, text: "Pregunta" },
      { resourceId: "b", helpful: true, text: "" },
    ]);
    expect(map.get("a")).toEqual({ yes: 1, no: 1, comments: 2 });
    expect(map.get("b")).toEqual({ yes: 1, no: 0, comments: 0 });
    expect(map.get("c")).toBeUndefined();
  });
});
