import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import FeedbackAdminList from "@/components/FeedbackAdminList";
import { pageTitle, panel } from "@/components/ui";
import { pageAdmin } from "@/lib/page-auth";
import { resourceTitles } from "@/lib/store/admin";
import { listFeedback, type FeedbackFilter } from "@/lib/store/feedback";

export const metadata: Metadata = { title: "Comentarios" };

const FILTERS: { value: FeedbackFilter; label: string; empty: string }[] = [
  { value: "unanswered", label: "Sin responder", empty: "No hay comentarios sin responder." },
  { value: "unhelpful", label: "No les sirvió", empty: "Nadie marcó un recurso como «no me sirvió»." },
  { value: "all", label: "Todos", empty: "Todavía no hay comentarios." },
];

export default function FeedbackPage({ searchParams }: PageProps<"/admin/comentarios">) {
  return (
    <main>
      <h1 className={pageTitle}>Comentarios</h1>
      <p className="mt-2 text-muted">Lo que los alumnos dejan en cada recurso. Tu respuesta la ven debajo de su comentario.</p>
      <Suspense fallback={<p className="mt-6 text-muted">Cargando…</p>}>
        <Feedback searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Feedback({ searchParams }: { searchParams: PageProps<"/admin/comentarios">["searchParams"] }) {
  await pageAdmin();
  const raw = (await searchParams).filtro;
  const current = FILTERS.find((f) => f.value === raw) ?? FILTERS[0];
  const feedback = await listFeedback({ filter: current.value });
  const titles = await resourceTitles(feedback.map((f) => f.resourceId));

  return (
    <div className="mt-6 space-y-4">
      <nav aria-label="Filtrar comentarios" className="flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "unanswered" ? "/admin/comentarios" : `/admin/comentarios?filtro=${f.value}`}
            aria-current={f.value === current.value ? "page" : undefined}
            className={`rounded-full border px-3 py-1 text-sm font-semibold ${f.value === current.value ? "border-tinta bg-tinta text-white" : "border-line bg-white hover:border-tinta/40"}`}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      <section className={`${panel} px-5 py-1`}>
        <FeedbackAdminList key={`${current.value}-${feedback.map((f) => f.id + (f.reply ? "r" : "")).join()}`} initial={feedback} context={Object.fromEntries(titles)} empty={current.empty} />
      </section>
    </div>
  );
}
