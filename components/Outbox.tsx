"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/fetcher";
import { formatDateTime } from "@/lib/format";
import FormError from "./FormError";
import { button, input, label, panel } from "./ui";

interface MailSummary {
  id: string;
  from: string;
  subject: string;
  attachments: { filename: string; size: number }[];
  createdAt: string;
}

export default function Outbox() {
  const initial = useSearchParams().get("para") ?? "";
  const [email, setEmail] = useState(initial);
  const [shown, setShown] = useState(initial);
  const [mails, setMails] = useState<MailSummary[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (to: string) => {
    if (!to) return;
    try {
      const data = await api<{ mails: MailSummary[] }>(`/api/outbox?para=${encodeURIComponent(to)}`);
      setMails(data.mails);
      setOpen((current) => current ?? data.mails[0]?.id ?? null);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  // Se actualiza sola cada 3 segundos, como MailHog.
  useEffect(() => {
    if (!shown) return;
    const first = setTimeout(() => void load(shown), 0);
    const timer = setInterval(() => void load(shown), 3000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load, shown]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const to = email.trim().toLowerCase();
    setOpen(null);
    setMails(null);
    setShown(to);
    window.history.replaceState(null, "", `/bandeja?para=${encodeURIComponent(to)}`);
  }

  return (
    <div className="mt-6">
      <h1 className="display text-3xl">Bandeja de demo</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Esta versión es una demo: no manda mails de verdad. El enlace para entrar queda acá. Es pública: no
        uses datos reales.
      </p>
      <form onSubmit={submit} className="mt-6 flex max-w-xl flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label htmlFor="para" className={label}>Ver los mails de</label>
          <input id="para" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vos@demo.test" className={input} />
        </div>
        <button type="submit" className={button}>Ver</button>
      </form>
      <div className="mt-4"><FormError message={error} /></div>
      {shown && mails?.length === 0 && <p className="mt-6 text-muted">Todavía no llegó nada para {shown}. Se actualiza sola.</p>}
      {mails && mails.length > 0 && (
        <div className="mt-6 grid gap-4 lg:grid-cols-[18rem_1fr]">
          <ul className={`${panel} divide-y divide-line self-start`}>
            {mails.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setOpen(m.id)}
                  aria-current={open === m.id ? "true" : undefined}
                  className={`block w-full p-3 text-left ${open === m.id ? "bg-hoja" : "hover:bg-hoja"}`}
                >
                  <p className="truncate font-semibold">{m.subject}</p>
                  <p className="truncate text-sm text-muted">{m.from.replace(/<.*>/, "").replace(/"/g, "")} · {formatDateTime(m.createdAt)}</p>
                  {m.attachments.length > 0 && (
                    <p className="truncate text-xs text-muted">📎 {m.attachments.map((a) => `${a.filename} (${Math.max(1, Math.round(a.size / 1024))} KB)`).join(", ")}</p>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {open && (
            <iframe
              key={open}
              title="Mail"
              src={`/api/outbox/${open}`}
              sandbox="allow-popups allow-top-navigation-by-user-activation"
              className={`${panel} h-[32rem] w-full bg-white`}
            />
          )}
        </div>
      )}
    </div>
  );
}
