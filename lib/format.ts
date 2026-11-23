// Formatos para mostrar, en hora argentina (el servidor de Render está en UTC).

export const TIME_ZONE = "America/Argentina/Buenos_Aires";

const dateTime = new Intl.DateTimeFormat("es-AR", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "22 nov, 21:05" en hora argentina. */
export function formatDateTime(iso: string | null): string {
  return iso ? dateTime.format(new Date(iso)) : "—";
}

/** "1 recurso" / "3 recursos". */
export function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString("es-AR")} ${n === 1 ? one : many}`;
}

/** 2048 → "2 KB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString("es-AR", { maximumFractionDigits: 1 })} MB`;
}
