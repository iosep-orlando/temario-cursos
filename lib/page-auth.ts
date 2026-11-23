import { notFound, redirect } from "next/navigation";
import { AuthError, requireUser, type Caller } from "./auth";

/** Para las páginas del servidor: el usuario de la sesión, o al login. */
export async function pageUser(): Promise<Caller> {
  try {
    return await requireUser();
  } catch (error) {
    if (error instanceof AuthError) redirect("/login");
    throw error;
  }
}

/**
 * Las páginas de /admin. proxy.ts ya frena a los alumnos con el rol del
 * JWT; acá se confirma con la base. Un alumno ve un 404: no hace falta
 * contarle que la página existe.
 */
export async function pageAdmin(): Promise<Caller> {
  const caller = await pageUser();
  if (caller.role !== "admin") notFound();
  return caller;
}
