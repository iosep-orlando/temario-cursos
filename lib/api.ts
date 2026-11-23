import { connection } from "next/server";
import { AuthError } from "./auth";

// Respuestas de error con la misma forma en toda la API: { error: "…" }
// con el código HTTP que corresponde.
export function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Envuelve un handler: un AuthError o un ApiError dan su código; lo
 * inesperado, un 500 con mensaje genérico (el detalle va al log, no al
 * navegador).
 */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    // Siempre en cada petición, nunca prerenderizado al compilar: sin esto,
    // Next.js intentaría generar los GET al compilar, y el catch de abajo
    // guardaría como respuesta fija el error de "no hay cookies".
    await connection();
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof AuthError) return jsonError(error.status, error.message);
      if (error instanceof ApiError) return jsonError(error.status, error.message);
      console.error(error);
      return jsonError(500, "Algo falló en el servidor. Probá de nuevo.");
    }
  };
}

/** El cuerpo JSON de la petición como objeto, o un 400. */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    if (typeof body === "object" && body !== null && !Array.isArray(body)) return body as Record<string, unknown>;
  } catch {
    // cae al error de abajo
  }
  throw new ApiError(400, "Cuerpo JSON inválido.");
}

/**
 * El dominio público, para el enlace del mail de ingreso: APP_URL, o
 * RENDER_EXTERNAL_URL (Render la pone sola), o localhost.
 */
export function publicUrl(): string {
  const configured = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL;
  return (configured || "http://localhost:3000").replace(/\/+$/, "");
}
