import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Check from "@/components/Check";
import FeedbackBox from "@/components/FeedbackBox";
import Markdown from "@/components/Markdown";
import ProgressBar from "@/components/ProgressBar";
import ResourceProgress from "@/components/ResourceProgress";
import { linkButton } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { pageUser } from "@/lib/page-auth";
import { computeProgress, neighbors } from "@/lib/course";
import { getCourseDoc, getOutline, getResourceDoc } from "@/lib/store/courses";
import { myFeedback } from "@/lib/store/feedback";
import { completedIn } from "@/lib/store/progress";

export const metadata: Metadata = { title: "Recurso" };

type Params = PageProps<"/cursos/[slug]/[resourceId]">["params"];

export default function ResourcePage({ params }: PageProps<"/cursos/[slug]/[resourceId]">) {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Resource params={params} />
    </Suspense>
  );
}

const notFoundOn404 = (error: unknown): never => {
  if (error instanceof ApiError && error.status === 404) notFound();
  throw error;
};

async function Resource({ params }: { params: Params }) {
  const caller = await pageUser();
  const { slug, resourceId } = await params;
  const course = await getCourseDoc(caller, { slug }).catch(notFoundOn404);
  const resource = await getResourceDoc(caller, resourceId).catch(notFoundOn404);
  if (!resource.courseId.equals(course._id)) notFound();

  const [outline, done, feedback] = await Promise.all([
    getOutline(course),
    completedIn(caller.userId, course._id),
    myFeedback(caller.userId, resource._id),
  ]);
  const progress = computeProgress(outline, done);
  const { prev, next } = neighbors(outline, resourceId);
  const href = (id: string) => `/cursos/${slug}/${id}`;
  const sectionIndex = outline.sections.findIndex((s) => s.id === resource.sectionId.toString());
  const section = outline.sections[sectionIndex];
  const number = `${sectionIndex + 1}.${section.resources.findIndex((r) => r.id === resourceId) + 1}`;

  return (
    <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
      {/* El índice a mano, con lo visto y dónde estás. */}
      <aside className="order-last lg:order-first lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto">
        <Link href={`/cursos/${slug}`} className="block font-extrabold leading-tight hover:underline">{outline.course.title}</Link>
        <div className="mt-2">
          <ProgressBar percent={progress.percent} label="Avance en el curso" />
        </div>
        <nav aria-label="Índice del curso" className="mt-4 space-y-4 text-sm">
          {outline.sections.map((s, si) => (
            <div key={s.id}>
              <p className="font-bold"><span className="tabular mr-2 text-birome">{si + 1}</span>{s.title}</p>
              <ol className="mt-1">
                {s.resources.map((r, ri) => (
                  <li key={r.id}>
                    <Link
                      href={href(r.id)}
                      aria-current={r.id === resourceId ? "page" : undefined}
                      className={`flex items-center gap-2 rounded-md px-2 py-1 ${r.id === resourceId ? "bg-resaltador/70 font-semibold" : "hover:bg-white"}`}
                    >
                      <Check done={done.has(r.id)} />
                      <span className="tabular w-7 text-muted">{si + 1}.{ri + 1}</span>
                      <span className="min-w-0 flex-1">{r.title}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </nav>
      </aside>

      <main className="min-w-0">
        <p className="text-sm text-muted">
          <Link href={`/cursos/${slug}`} className={linkButton}>{outline.course.title}</Link>
          <span aria-hidden="true"> › </span>
          {section.title}
        </p>
        <h1 className="display mt-2 text-3xl sm:text-4xl">
          <span className="tabular mr-3 text-birome">{number}</span>
          {resource.title}
        </h1>
        {/* La línea roja del margen, como en el cuaderno. */}
        <article className="mt-6 rounded-lg border border-line bg-white p-5 sm:p-8">
          <div className="sm:border-l-2 sm:border-margen/50 sm:pl-6">
            <Markdown content={resource.content} />
          </div>
        </article>
        <div className="mt-6">
          {/* key: si lo visto cambió en el servidor (otra pestaña), arranca con lo nuevo. */}
          <ResourceProgress
            key={`${resourceId}-${done.has(resourceId)}`}
            resourceId={resourceId}
            initialDone={done.has(resourceId)}
            prev={prev ? { href: href(prev.id), title: prev.title } : null}
            next={next ? { href: href(next.id), title: next.title } : null}
            courseHref={`/cursos/${slug}`}
          />
        </div>
        <div className="mt-8">
          <FeedbackBox key={`${resourceId}-${feedback.length}-${feedback.filter((f) => f.reply).length}`} resourceId={resourceId} initial={feedback} />
        </div>
      </main>
    </div>
  );
}
