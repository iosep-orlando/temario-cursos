import type { Role } from "./types";

/** La página de inicio de cada rol. */
export function homeFor(role: Role): string {
  return role === "admin" ? "/admin" : "/cursos";
}

/**
 * Adónde ir después de entrar: el `next` que dejó proxy.ts, solo si es una
 * página de la app (/cursos o /admin) y nunca otra web (sería un
 * redireccionador abierto). Si no, el inicio de su rol.
 */
export function safeNext(next: unknown, role: Role): string {
  if (typeof next !== "string" || !/^\/(cursos|admin)(\/|\?|$)/.test(next)) return homeFor(role);
  if (next.startsWith("/admin") && role !== "admin") return homeFor(role);
  return next;
}
