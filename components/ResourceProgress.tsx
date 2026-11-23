"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorMessage } from "@/lib/fetcher";
import type { ProgressDTO } from "@/lib/types";
import FormError from "./FormError";
import { button, buttonSecondary } from "./ui";

interface Neighbor {
  href: string;
  title: string;
}

/**
 * Al pie del recurso: marcarlo como visto y moverse al anterior o al
 * siguiente. "Marcar como visto y seguir" hace las dos cosas.
 */
export default function ResourceProgress({
  resourceId,
  initialDone,
  prev,
  next,
  courseHref,
}: {
  resourceId: string;
  initialDone: boolean;
  prev: Neighbor | null;
  next: Neighbor | null;
  courseHref: string;
}) {
  const router = useRouter();
  const [done, setDone] = useState(initialDone);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function mark(value: boolean, then?: string) {
    setPending(true);
    setError(null);
    try {
      await api<ProgressDTO>(`/api/resources/${resourceId}/progress`, { method: "POST", json: { done: value } });
      setDone(value);
      if (then) router.push(then);
      router.refresh(); // el índice de al lado y el avance se actualizan
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {!done && next && (
          <button type="button" disabled={pending} onClick={() => mark(true, next.href)} className={button}>
            Marcar como visto y seguir
          </button>
        )}
        {!done && !next && (
          <button type="button" disabled={pending} onClick={() => mark(true, courseHref)} className={button}>
            Marcar como visto y terminar
          </button>
        )}
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 font-semibold">
          <input
            type="checkbox"
            checked={done}
            disabled={pending}
            onChange={(e) => mark(e.target.checked)}
            className="h-5 w-5 accent-[var(--color-visto)]"
          />
          {done ? "Visto" : "Marcar como visto"}
        </label>
      </div>
      <FormError message={error} />
      <nav aria-label="Recorrido del curso" className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
        {prev ? (
          <Link href={prev.href} className={`${buttonSecondary} justify-start text-left`}>
            <span aria-hidden="true">←</span>
            <span className="min-w-0">
              <span className="block text-xs font-normal text-muted">Anterior</span>
              <span className="block truncate">{prev.title}</span>
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={next.href} className={`${buttonSecondary} justify-end text-right`}>
            <span className="min-w-0">
              <span className="block text-xs font-normal text-muted">Siguiente</span>
              <span className="block truncate">{next.title}</span>
            </span>
            <span aria-hidden="true">→</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
