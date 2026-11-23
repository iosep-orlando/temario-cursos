"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/fetcher";
import { formatDateTime } from "@/lib/format";
import type { FeedbackDTO } from "@/lib/types";
import FormError from "./FormError";
import { button, buttonSecondary, input, linkButton } from "./ui";

export interface FeedbackContext {
  title: string;
  courseTitle: string;
  courseId: string;
}

/** El feedback para el admin: quién, sobre qué recurso, si le sirvió, y responder o borrar. */
export default function FeedbackAdminList({
  initial,
  context,
  empty,
}: {
  initial: FeedbackDTO[];
  context?: Record<string, FeedbackContext>;
  empty: string;
}) {
  const [items, setItems] = useState(initial);
  if (items.length === 0) return <p className="text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-line">
      {items.map((f) => (
        <FeedbackItem
          key={f.id}
          item={f}
          context={context?.[f.resourceId]}
          onChange={(updated) => setItems((list) => list.map((x) => (x.id === updated.id ? updated : x)))}
          onDelete={() => setItems((list) => list.filter((x) => x.id !== f.id))}
        />
      ))}
    </ul>
  );
}

function FeedbackItem({
  item,
  context,
  onChange,
  onDelete,
}: {
  item: FeedbackDTO;
  context?: FeedbackContext;
  onChange: (f: FeedbackDTO) => void;
  onDelete: () => void;
}) {
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState(item.reply?.text ?? "");
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reply(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      onChange(await api<FeedbackDTO>(`/api/feedback/${item.id}/reply`, { method: "PUT", json: { text } }));
      setReplying(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    try {
      await api(`/api/feedback/${item.id}`, { method: "DELETE" });
      onDelete();
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <li className="py-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        <span className="font-semibold">{item.userName}</span>
        <span className="text-muted">{item.userEmail}</span>
        <span className="text-muted">{formatDateTime(item.createdAt)}</span>
        {item.helpful !== null && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${item.helpful ? "bg-visto/10 text-visto" : "bg-margen/10 text-margen"}`}>
            {item.helpful ? "Le sirvió" : "No le sirvió"}
          </span>
        )}
      </div>
      {context && (
        <p className="mt-1 text-sm">
          <Link href={`/admin/recursos/${item.resourceId}`} className={linkButton}>{context.title}</Link>
          <span className="text-muted"> en {context.courseTitle}</span>
        </p>
      )}
      {item.text ? <p className="mt-2 font-serif">{item.text}</p> : <p className="mt-2 text-sm text-muted">(Solo votó, sin comentario.)</p>}
      {item.reply && !replying && (
        <p className="mt-2 border-l-2 border-birome pl-3 text-sm">
          <span className="font-semibold text-birome">Tu respuesta: </span>
          <span className="font-serif">{item.reply.text}</span>
        </p>
      )}
      {replying ? (
        <form onSubmit={reply} className="mt-3 space-y-2">
          <label htmlFor={`r-${item.id}`} className="sr-only">Respuesta</label>
          <textarea id={`r-${item.id}`} rows={2} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} className={input} placeholder="La respuesta la ve el alumno debajo de su comentario." />
          <FormError message={error} />
          <div className="flex gap-2">
            <button type="submit" disabled={pending || !text.trim()} className={button}>{pending ? "Guardando…" : "Responder"}</button>
            <button type="button" onClick={() => setReplying(false)} className={buttonSecondary}>Cancelar</button>
          </div>
        </form>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
          {item.text && (
            <button type="button" onClick={() => setReplying(true)} className={linkButton}>
              {item.reply ? "Editar la respuesta" : "Responder"}
            </button>
          )}
          {confirmDelete ? (
            <span className="flex items-center gap-2">
              <span className="font-semibold">¿Borrar este comentario?</span>
              <button type="button" onClick={remove} disabled={pending} className="font-semibold text-margen hover:underline">Sí, borrar</button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="font-semibold text-muted hover:underline">No</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="font-semibold text-muted hover:text-margen">Borrar</button>
          )}
          {!replying && <FormError message={error} />}
        </div>
      )}
    </li>
  );
}
