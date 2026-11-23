import type { CourseOutlineDTO, Helpful, ProgressDTO, ResourceSummaryDTO } from "./types";

// ---------------------------------------------------------------------------
// Cálculos sobre un curso que no tocan la base: el recorrido en orden, el
// anterior y el siguiente, el avance y las valoraciones. Los usan el
// servidor y los tests.
// ---------------------------------------------------------------------------

/** Los recursos del curso en el orden en que se recorren: sección por sección. */
export function flatten(outline: CourseOutlineDTO): ResourceSummaryDTO[] {
  return outline.sections.flatMap((s) => s.resources);
}

/** El anterior y el siguiente de un recurso, en el orden del curso (cruzando secciones). */
export function neighbors(outline: CourseOutlineDTO, resourceId: string) {
  const all = flatten(outline);
  const index = all.findIndex((r) => r.id === resourceId);
  return {
    index,
    total: all.length,
    prev: index > 0 ? all[index - 1] : null,
    next: index >= 0 && index < all.length - 1 ? all[index + 1] : null,
  };
}

/** El avance en un curso, calculado contra su índice actual (si se borra un recurso, deja de contar). */
export function computeProgress(outline: CourseOutlineDTO, completed: Set<string>): ProgressDTO {
  const all = flatten(outline);
  const done = all.filter((r) => completed.has(r.id));
  const next = all.find((r) => !completed.has(r.id)) ?? null;
  return {
    done: done.length,
    total: all.length,
    percent: all.length === 0 ? 0 : Math.round((done.length / all.length) * 100),
    completed: done.map((r) => r.id),
    nextResourceId: next?.id ?? null,
  };
}

/** Cuántos "me sirvió", "no me sirvió" y comentarios tiene cada recurso. */
export function rate(docs: { resourceId: { toString(): string }; helpful: Helpful; text: string }[]): Map<string, { yes: number; no: number; comments: number }> {
  const map = new Map<string, { yes: number; no: number; comments: number }>();
  for (const d of docs) {
    const key = d.resourceId.toString();
    const row = map.get(key) ?? { yes: 0, no: 0, comments: 0 };
    if (d.helpful === true) row.yes++;
    if (d.helpful === false) row.no++;
    if (d.text) row.comments++;
    map.set(key, row);
  }
  return map;
}

