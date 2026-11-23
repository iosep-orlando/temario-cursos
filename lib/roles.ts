import type { Role } from "./types";

// ---------------------------------------------------------------------------
// Quién es admin: los emails de ADMIN_EMAILS (separados por comas). Los
// demás son alumnos. Nadie se puede hacer admin desde la web: para sumar
// uno, se agrega su email a la variable y entra de nuevo.
// ---------------------------------------------------------------------------

export function adminEmails(env: Record<string, string | undefined> = process.env): string[] {
  return (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function roleFor(email: string, env: Record<string, string | undefined> = process.env): Role {
  return adminEmails(env).includes(email.trim().toLowerCase()) ? "admin" : "student";
}

export const ROLE_LABEL: Record<Role, string> = { admin: "Admin", student: "Alumno" };
