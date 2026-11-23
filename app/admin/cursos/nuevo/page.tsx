import type { Metadata } from "next";
import Link from "next/link";
import CourseForm from "@/components/CourseForm";
import { linkButton, pageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Nuevo curso" };

export default function NewCoursePage() {
  return (
    <main className="max-w-3xl">
      <Link href="/admin" className={`${linkButton} text-sm`}>← Panel</Link>
      <h1 className={`${pageTitle} mt-2`}>Nuevo curso</h1>
      <p className="mt-2 text-muted">Primero los datos; después armás el índice con secciones y recursos.</p>
      <div className="mt-6">
        <CourseForm course={null} />
      </div>
    </main>
  );
}
