import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Check from "@/components/Check";
import ProgressBar from "@/components/ProgressBar";
import { button, buttonSecondary, linkButton } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { pageUser } from "@/lib/page-auth";
import { getCourseDoc, getOutline } from "@/lib/store/courses";
import { computeProgress } from "@/lib/course";
import { completedIn } from "@/lib/store/progress";

export const metadata: Metadata = { title: "Curso" };

export default function CoursePage({ params }: PageProps<"/cursos/[slug]">) {
  return (
    <main>
      <Link href="/cursos" className={`${linkButton} text-sm`}>← Cursos</Link>
      <Suspense fallback={<p className="mt-6 text-muted">Cargando…</p>}>
        <Course params={params} />
      </Suspense>
    </main>
  );
}

// El índice del curso: secciones y recursos en el orden que eligió el admin.
async function Course({ params }: { params: PageProps<"/cursos/[slug]">["params"] }) {
  const caller = await pageUser();
  const { slug } = await params;
  const course = await getCourseDoc(caller, { slug }).catch((error) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  const [outline, done] = await Promise.all([getOutline(course), completedIn(caller.userId, course._id)]);
  const progress = computeProgress(outline, done);
  const first = outline.sections.flatMap((s) => s.resources)[0];

  return (
    <div className="mt-3 grid gap-8 lg:grid-cols-[1fr_18rem]">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="display text-4xl sm:text-5xl">{outline.course.title}</h1>
          {!outline.course.published && <span className="rounded-full bg-resaltador px-2 py-0.5 text-xs font-bold">Borrador: los alumnos no lo ven</span>}
        </div>
        <p className="mt-3 max-w-2xl font-serif text-lg text-muted">{outline.course.description}</p>

        <section aria-labelledby="indice" className="mt-8 border-l-2 border-margen/60 pl-5">
          <h2 id="indice" className="text-sm font-bold text-margen">Índice</h2>
          {outline.sections.length === 0 && <p className="mt-2 text-muted">Este curso todavía no tiene contenido.</p>}
          <ol className="mt-3 space-y-6">
            {outline.sections.map((section, si) => (
              <li key={section.id}>
                <h3 className="flex items-baseline text-lg font-extrabold">
                  <span className="tabular mr-3 text-birome">{si + 1}</span>
                  {section.title}
                </h3>
                <ol className="mt-2 space-y-1">
                  {section.resources.map((r, ri) => {
                    const isNext = r.id === progress.nextResourceId;
                    return (
                      <li key={r.id}>
                        <Link
                          href={`/cursos/${outline.course.slug}/${r.id}`}
                          className={`flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-white ${isNext ? "bg-resaltador/60" : ""}`}
                        >
                          <Check done={done.has(r.id)} />
                          <span className="tabular w-8 text-sm text-muted">{si + 1}.{ri + 1}</span>
                          <span className="font-serif">{r.title}</span>
                          {isNext && <span className="ml-auto text-xs font-bold">{progress.done > 0 ? "Por acá vas" : "Empezá acá"}</span>}
                        </Link>
                      </li>
                    );
                  })}
                  {section.resources.length === 0 && <li className="px-2 text-sm text-muted">Sin recursos todavía.</li>}
                </ol>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-lg border border-line bg-white p-5">
          <p className="text-sm font-semibold">Tu avance</p>
          <div className="mt-2">
            <ProgressBar percent={progress.percent} label="Avance en el curso" />
          </div>
          <p className="mt-1 text-sm text-muted">
            {progress.done} de {progress.total} recursos vistos
          </p>
          <div className="mt-4">
            {progress.nextResourceId ? (
              <Link href={`/cursos/${outline.course.slug}/${progress.nextResourceId}`} className={`${button} w-full`}>
                {progress.done > 0 ? "Seguir donde quedaste" : "Empezar el curso"}
              </Link>
            ) : first ? (
              <Link href={`/cursos/${outline.course.slug}/${first.id}`} className={`${buttonSecondary} w-full`}>
                ¡Terminaste! Repasar desde el principio
              </Link>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}
