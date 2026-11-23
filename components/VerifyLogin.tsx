"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api, errorMessage } from "@/lib/fetcher";
import FormError from "./FormError";
import { button } from "./ui";

/**
 * Un botón y no la entrada automática al abrir el enlace: los antivirus de
 * correo abren los enlaces de los mails para revisarlos, y gastarían el
 * enlace (sirve una sola vez) antes que la persona.
 */
export default function VerifyLogin() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const next = params.get("next") ?? "";
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enter() {
    setPending(true);
    setError(null);
    try {
      const result = await api<{ next: string }>("/api/auth/verify", { method: "POST", json: { token, next } });
      router.replace(result.next);
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  if (!token) {
    return (
      <p className="mt-8 text-muted">
        Falta el enlace. <Link href="/login" className="font-semibold text-birome hover:underline">Pedí uno nuevo</Link>.
      </p>
    );
  }
  return (
    <div className="mt-8 space-y-4">
      <h1 className="display text-3xl">Ya casi</h1>
      <p className="text-muted">Pulsá el botón para entrar con el enlace de tu correo.</p>
      <FormError message={error} />
      {error ? (
        <Link href="/login" className={button}>Pedir un enlace nuevo</Link>
      ) : (
        <button type="button" onClick={enter} disabled={pending} className={`${button} w-full`}>
          {pending ? "Entrando…" : "Entrar a Temario"}
        </button>
      )}
    </div>
  );
}
