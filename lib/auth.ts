import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { ObjectId } from "mongodb";
import { collections, toObjectId } from "./db";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession, type SessionPayload } from "./jwt";
import type { Role } from "./types";

// ---------------------------------------------------------------------------
// Sesión (cookie httpOnly con el JWT), enlaces mágicos y las comprobaciones
// de usuario y de rol que hacen todas las rutas de la API.
// ---------------------------------------------------------------------------

export async function getSession(): Promise<SessionPayload | null> {
  const jwt = (await cookies()).get(SESSION_COOKIE)?.value;
  return jwt ? verifySession(jwt) : null;
}

export async function startSession(payload: SessionPayload): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, await signSession(payload), {
    httpOnly: true, // el JavaScript de la página no la puede leer
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // no viaja en peticiones POST desde otros sitios
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

// --- Enlaces mágicos -----------------------------------------------------------

/** Cuánto vale un enlace para entrar. */
export const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000;
/** Enlaces que se pueden pedir por email en LOGIN_RATE_WINDOW_MS. */
export const LOGIN_RATE_LIMIT = 3;
export const LOGIN_RATE_WINDOW_MS = 10 * 60 * 1000;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** 32 bytes al azar: imposible de adivinar. En la base solo se guarda el hash. */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

// --- Usuario y rol de la sesión ------------------------------------------------------

export interface Caller {
  userId: ObjectId;
  email: string;
  name: string;
  role: Role;
}

export class AuthError extends Error {
  constructor(
    public status: 401 | 403,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Quién llama. El usuario sale del JWT firmado, nunca de la petición, y
 * el rol se toma de la base, no del JWT: si a alguien le sacan el rol de
 * admin, lo pierde en la próxima petición, sin esperar a que venza la
 * sesión.
 */
export async function requireUser(): Promise<Caller> {
  const session = await getSession();
  const userId = toObjectId(session?.sub);
  if (!session || !userId) throw new AuthError(401, "Tenés que iniciar sesión.");
  const { users } = await collections();
  const user = await users.findOne({ _id: userId });
  if (!user) throw new AuthError(401, "Tu cuenta ya no existe. Entrá de nuevo.");
  return { userId, email: user.email, name: user.name, role: user.role };
}

/** Las rutas de administración: role === "admin", o 403. */
export async function requireAdmin(): Promise<Caller> {
  const caller = await requireUser();
  if (caller.role !== "admin") throw new AuthError(403, "Esto es solo para administradores.");
  return caller;
}
