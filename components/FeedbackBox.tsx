"use client";

import { useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/fetcher";
import { formatDateTime } from "@/lib/format";
import type { FeedbackDTO, Helpful } from "@/lib/types";
import FormError from "./FormError";
import { button, input, label } from "./ui";

/**
 * El feedback del alumno sobre un recurso: "¿te sirvió?" y un comentario.
 * Debajo, lo que ya dejó, con la respuesta del admin si la hay.
 */
export default function FeedbackBox({ resourceId, initial }: { resourceId: string; initial: FeedbackDTO[] }) {
  const [mine, setMine] = useState(initial);
  const [helpful, setHelpful] = useState<Helpful>(null);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const created = await api<FeedbackDTO>(`/api/resources/${resourceId}/feedback`, { method: "POST", json: { text, helpful } });
      setMine((list) => [created, ...list]);
      setText("");
      setHelpful(null);
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  const choice = (value: boolean, text: string) => (
    <button
      type="button"
      aria-pressed={helpful === value}
      onClick={() => {
        setSent(false);
        setHelpful(helpful === value ? null : value);
      }}
      className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${
        helpful === value ? (value ? "border-visto bg-visto text-white" : "border-margen bg-margen text-white") : "border-line bg-white hover:border-tinta/30"
      }`}
    >
      {text}
    </button>
  );

  return (
    <section aria-labelledby="feedback-title" className="rounded-lg border border-line bg-white p-5">
      <h2 id="feedback-title" className="text-lg font-extrabold">¿Te sirvió este recurso?</h2>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <div className="flex gap-2" role="group" aria-label="¿Te sirvió?">
          {choice(true, "Sí, me sirvió")}
          {choice(false, "No mucho")}
        </div>
        <div>
          <label htmlFor="fb-text" className={label}>Comentario (opcional)</label>
          <textarea
            id="fb-text"
            rows={3}
            maxLength={2000}
            value={text}
            onChange={(e) => {
              setSent(false);
              setText(e.target.value);
            }}
            placeholder="¿Qué faltó, qué no se entendió, qué estuvo bueno?"
            className={input}
          />
        </div>
        <FormError message={error} />
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending || (!text.trim() && helpful === null)} className={button}>
            {pending ? "Enviando…" : "Enviar"}
          </button>
          {sent && <span role="status" className="text-sm font-semibold text-visto">¡Gracias! Lo va a leer quien armó el curso.</span>}
        </div>
      </form>

      {mine.length > 0 && (
        <div className="mt-6 border-t border-line pt-4">
          <h3 className="text-sm font-bold text-muted">Lo que dejaste</h3>
          <ul className="mt-2 space-y-3">
            {mine.map((f) => (
              <li key={f.id} className="text-sm">
                <p>
                  {f.helpful !== null && (
                    <span className={`mr-2 font-semibold ${f.helpful ? "text-visto" : "text-margen"}`}>{f.helpful ? "Te sirvió." : "No mucho."}</span>
                  )}
                  {f.text && <span className="font-serif">{f.text}</span>}
                  <span className="ml-2 text-xs text-muted">{formatDateTime(f.createdAt)}</span>
                </p>
                {f.reply && (
                  <p className="mt-1 border-l-2 border-birome pl-3">
                    <span className="font-semibold text-birome">Respuesta: </span>
                    <span className="font-serif">{f.reply.text}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
