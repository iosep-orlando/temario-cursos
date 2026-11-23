// Llamadas a la API desde el navegador, con el mensaje de error del servidor.

export class FetchError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: json !== undefined ? { "content-type": "application/json", ...rest.headers } : rest.headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new FetchError(0, "No se pudo contactar con el servidor.");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new FetchError(res.status, data.error ?? "Algo falló. Probá de nuevo.");
  return data as T;
}

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Algo falló. Probá de nuevo.";
