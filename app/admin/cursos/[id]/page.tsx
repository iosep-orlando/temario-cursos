import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import CourseForm from "@/components/CourseForm";
import OutlineEditor from "@/components/OutlineEditor";
import { buttonSecondary, linkButton } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { pageAdmin } from "@/lib/page-auth";
import { getCourseDoc, getOutline } from "@/lib/store/courses";

export const metadata: Metadata = { title: "Editar curso" };

export default function EditCoursePage({ params }: PageProps<"/admin/cursos/[id]">) {
  return (
    <main>
      <Link href="/admin" className={`${linkButton} text-sm`}>← Panel</Link>
      <Suspense fallback={<p className="mt-6 text-muted">Cargando…</p>}>
        <Editor params={params} />
      </Suspense>
    </main>
  );
}

// Server Component: el curso y su índice salen de MongoDB; los cambios van a la API.
async function Editor({ params }: { params: PageProps<"/admin/cursos/[id]">["params"] }) {
  const caller = await pageAdmin();
  const { id } = await params;
  const course = await getCourseDoc(caller, { id }).catch((error) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  const outline = await getOutline(course);

  return (
    <>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="display text-4xl">{outline.course.title}</h1>
        <Link href={`/cursos/${outline.course.slug}`} className={buttonSecondary}>Ver como alumno</Link>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* key del índice: después de cada cambio arranca sin ediciones a medias. */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <CourseForm key={outline.course.id} course={outline.course} />
        </div>
        <OutlineEditor key={`o-${outline.course.updatedAt}`} outline={outline} />
      </div>
    </>
  );
}
