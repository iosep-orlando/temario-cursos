import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ProgressBar from "@/components/ProgressBar";
import { linkButton, pageTitle, panel } from "@/components/ui";
import { plural } from "@/lib/format";
import { pageUser } from "@/lib/page-auth";
import { getCourseDoc, getOutline, listCourses } from "@/lib/store/courses";
import { computeProgress } from "@/lib/course";
import { completedByCourse } from "@/lib/store/progress";

export const metadata: Metadata = { title: "Cursos" };

export default function CoursesPage() {
  return (
    <main>
      <h1 className={pageTitle}>Cursos</h1>
      <Suspense fallback={<p className="mt-6 text-muted">Cargando…</p>}>
        <CourseList />
      </Suspense>
    </main>
  );
}

// Server Component: lee MongoDB directamente.
async function CourseList() {
  const caller = await pageUser();
  const [courses, done] = await Promise.all([listCourses(caller), completedByCourse(caller.userId)]);
  if (courses.length === 0) {
    return <p className="mt-6 text-muted">Todavía no hay cursos publicados. Volvé en unos días.</p>;
  }
  const outlines = await Promise.all(courses.map(async (c) => getOutline(await getCourseDoc(caller, { id: c.id }))));

  return (
    <ul className="mt-6 grid gap-4 md:grid-cols-2">
      {courses.map((course, i) => {
        const progress = computeProgress(outlines[i], done.get(course.id) ?? new Set());
        const started = progress.done > 0;
        return (
          <li key={course.id} className={`${panel} flex flex-col p-5`}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-extrabold tracking-tight">
                <Link href={`/cursos/${course.slug}`} className="hover:underline">{course.title}</Link>
              </h2>
              {!course.published && <span className="rounded-full bg-resaltador px-2 py-0.5 text-xs font-bold">Borrador</span>}
            </div>
            <p className="mt-2 flex-1 font-serif text-muted">{course.description}</p>
            <p className="mt-3 text-sm text-muted">
              {plural(course.sections, "sección", "secciones")}, {plural(course.resources, "recurso", "recursos")}
            </p>
            <div className="mt-3">
              <ProgressBar percent={progress.percent} label={`Avance en ${course.title}`} />
            </div>
            <div className="mt-4">
              {progress.nextResourceId ? (
                <Link href={`/cursos/${course.slug}/${progress.nextResourceId}`} className={linkButton}>
                  {started ? "Seguir donde quedaste" : "Empezar"}
                </Link>
              ) : (
                <Link href={`/cursos/${course.slug}`} className={linkButton}>
                  {progress.total > 0 ? "Terminado: repasar" : "Ver el curso"}
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
