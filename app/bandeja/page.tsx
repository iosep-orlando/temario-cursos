import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import Logo from "@/components/Logo";
import Outbox from "@/components/Outbox";
import { isOutbox } from "@/lib/mail";

export const metadata: Metadata = { title: "Bandeja de demo", robots: { index: false } };

export default function OutboxPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <Logo href="/login" />
      <Suspense fallback={<p className="mt-6 text-muted">Cargando…</p>}>
        <OutboxGate />
      </Suspense>
    </main>
  );
}

async function OutboxGate() {
  await connection(); // MAIL_TRANSPORT se lee al pedir la página, no al compilar
  if (!isOutbox()) notFound();
  return <Outbox />;
}
