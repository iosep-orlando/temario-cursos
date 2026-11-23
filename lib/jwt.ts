import { SignJWT, jwtVerify } from "jose";
import type { Role } from "./types";

// JWT de sesión (HS256). Sin base de datos: lo usa también proxy.ts, que
// corre antes de cada página. Lleva el rol: proxy.ts no deja entrar a
// /admin a un alumno sin consultar la base.

export const SESSION_COOKIE = "session";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface SessionPayload {
  sub: string; // id del usuario
  email: string;
  role: Role;
}

/**
 * JWT_SECRET firma las sesiones. En desarrollo, si falta, se usa uno fijo
 * (así el .env.local del enunciado funciona tal cual); en producción es
 * obligatorio: con un secreto conocido cualquiera podría fabricarse una sesión.
 */
export function getSecret(env: Record<string, string | undefined> = process.env): Uint8Array {
  const secret = env.JWT_SECRET || (env.NODE_ENV === "production" ? "" : "solo-para-desarrollo-no-usar-en-produccion");
  if (!secret) throw new Error('Falta la variable de entorno "JWT_SECRET"');
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySession(jwt: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(jwt, getSecret(), { algorithms: ["HS256"] });
    const { sub, email, role } = payload;
    if (typeof sub !== "string" || typeof email !== "string") return null;
    if (role !== "admin" && role !== "student") return null;
    return { sub, email, role };
  } catch {
    return null;
  }
}
