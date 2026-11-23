import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import FeedbackAdminList from "@/components/FeedbackAdminList";
import ResourceEditor from "@/components/ResourceEditor";
import { linkButton, panel } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { pageAdmin } from "@/lib/page-auth";
import { getCourseDoc, getResource, getSectionDoc } from "@/lib/store/courses";
import { rate } from "@/lib/course";
import { listFeedback } from "@/lib/store/feedback";
import { toObjectId } from "@/lib/db";

export const metadata: Metadata = { title: "Editar recurso" };

export default function EditResourcePage({ params }: PageProps<"/admin/recursos/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Editor params={params} />
    </Suspense>
  );
}

async function Editor({ params }: { params: PageProps<"/admin/recursos/[id]">["params"] }) {
  const caller = await pageAdmin();
  const { id } = await params;
  const resource = await getResource(caller, id).catch((error) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  const [course, section, feedback] = await Promise.all([
    getCourseDoc(caller, { id: resource.courseId }),
    getSectionDoc(resource.sectionId),
    listFeedback({ resourceId: toObjectId(id)! }),
  ]);
  const ratings = rate(feedback.map((f) => ({ resourceId: f.resourceId, helpful: f.helpful, text: f.text }))).get(id) ?? { yes: 0, no: 0, comments: 0 };

  return (
    <main>
      <p className="text-sm text-muted">
        <Link href={`/admin/cursos/${course._id}`} className={linkButton}>{course.title}</Link>
        <span aria-hidden="true"> › </span>
        {section.title}
      </p>
      <div className="mt-4">
        <ResourceEditor key={resource.id} resource={resource} courseHref={`/admin/cursos/${course._id}`} studentHref={`/cursos/${course.slug}/${id}`} />
      </div>
      <section className={`${panel} mt-8 px-5 py-4`} aria-labelledby="fb">
        <h2 id="fb" className="text-lg font-extrabold">Lo que dicen los alumnos</h2>
        <p className="tabular text-sm text-muted">
          <span className="font-semibold text-visto">{ratings.yes} le sirvió</span>,{" "}
          <span className="font-semibold text-margen">{ratings.no} no le sirvió</span>, {ratings.comments} con comentario.
        </p>
        <FeedbackAdminList key={feedback.map((f) => f.id + (f.reply ? "r" : "")).join()} initial={feedback} empty="Todavía nadie dejó feedback en este recurso." />
      </section>
    </main>
  );
}
