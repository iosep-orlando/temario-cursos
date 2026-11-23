"use client";

import { useSearchParams } from "next/navigation";
import { useLayoutEffect, useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/fetcher";
import FormError from "./FormError";
import { button, input, label, linkButton } from "./ui";

export default function LoginForm({ demo = false }: { demo?: boolean }) {
  const next = useSearchParams().get("next") ?? "";
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Next.js 16 esconde la página en vez de cerrarla: al volver, de cero.
  useLayoutEffect(
    () => () => {
      setSentTo(null);
      setPending(false);
      setError(null);
    },
    [],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api("/api/auth/magic-link", { method: "POST", json: { email, next } });
      setSentTo(email.trim().toLowerCase());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  if (sentTo) {
    return (
      <div className="mt-8 rounded-lg border border-line bg-white p-6" role="status">
        <p className="text-lg font-semibold">Revisá tu correo</p>
        <p className="mt-2 text-muted">
          Te mandamos un enlace a <strong className="text-tinta">{sentTo}</strong>. Abrilo en este navegador.
        </p>
        {demo ? (
          <p className="mt-4 rounded-md bg-hoja p-3 text-sm">
            Esta versión es una demo y no manda mails de verdad: el enlace está en la{" "}
            <a href={`/bandeja?para=${encodeURIComponent(sentTo)}`} className={linkButton}>
              bandeja de demo
            </a>
            .
          </p>
        ) : process.env.NODE_ENV !== "production" && (
          <p className="mt-4 rounded-md bg-hoja p-3 text-sm">
            En desarrollo los mails no salen: miralo en{" "}
            <a href="http://localhost:8025" target="_blank" rel="noreferrer" className={linkButton}>
              MailHog (localhost:8025)
            </a>
            .
          </p>
        )}
        <button type="button" onClick={() => setSentTo(null)} className={`${linkButton} mt-4 text-sm`}>
          Usar otro email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      {demo && (
        <p className="rounded-md border border-line bg-white p-3 text-sm text-muted">
          Demo: entrá con cualquier email inventado, por ejemplo <strong className="text-tinta">tu-nombre@demo.test</strong>.
          Los mails no salen: los ves en la bandeja de demo.
        </p>
      )}
      <div>
        <label htmlFor="email" className={label}>Email</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={input}
        />
      </div>
      <FormError message={error} />
      <button type="submit" disabled={pending} className={`${button} w-full`}>
        {pending ? "Mandando…" : "Mandame el enlace"}
      </button>
    </form>
  );
}
