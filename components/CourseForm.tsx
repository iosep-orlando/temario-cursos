"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/fetcher";
import { slugify } from "@/lib/validation";
import type { CourseDTO } from "@/lib/types";
import FormError from "./FormError";
import { button, buttonDanger, buttonSecondary, hint, input, label, panel } from "./ui";

/** Los datos del curso: título, dirección, descripción y si está publicado. */
export default function CourseForm({ course }: { course: CourseDTO | null }) {
  const router = useRouter();
  const [title, setTitle] = useState(course?.title ?? "");
  const [slug, setSlug] = useState(course?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(course));
  const [description, setDescription] = useState(course?.description ?? "");
  const [published, setPublished] = useState(course?.published ?? false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dirty =
    !course || title !== course.title || slug !== course.slug || description !== course.description || published !== course.published;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      const body = { title, slug: slug || slugify(title), description, published };
      if (course) {
        await api<CourseDTO>(`/api/courses/${course.id}`, { method: "PUT", json: body });
        setSaved(true);
        router.refresh();
      } else {
        const created = await api<CourseDTO>("/api/courses", { method: "POST", json: body });
        router.push(`/admin/cursos/${created.id}`);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!course) return;
    setPending(true);
    try {
      await api(`/api/courses/${course.id}`, { method: "DELETE" });
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className={`${panel} grid gap-4 p-5`} aria-label="Datos del curso">
      <div>
        <label htmlFor="c-title" className={label}>Título</label>
        <input
          id="c-title"
          required
          maxLength={120}
          value={title}
          onChange={(e) => {
            setSaved(false);
            setTitle(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          className={input}
        />
      </div>
      <div>
        <label htmlFor="c-slug" className={label}>Dirección</label>
        <div className="flex items-center rounded-md border border-line bg-white focus-within:border-birome focus-within:ring-2 focus-within:ring-birome/20">
          <span className="pl-3 text-muted">/cursos/</span>
          <input
            id="c-slug"
            value={slug}
            onChange={(e) => {
              setSaved(false);
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
            className="w-full rounded-md bg-transparent py-2 pr-3 outline-none"
          />
        </div>
        <p className={hint}>Se arma sola con el título. Minúsculas, números y guiones.</p>
      </div>
      <div>
        <label htmlFor="c-desc" className={label}>Descripción</label>
        <textarea id="c-desc" rows={3} maxLength={1000} value={description} onChange={(e) => { setSaved(false); setDescription(e.target.value); }} className={input} />
      </div>
      <label className="flex items-start gap-3">
        <input type="checkbox" checked={published} onChange={(e) => { setSaved(false); setPublished(e.target.checked); }} className="mt-1 h-5 w-5 accent-[var(--color-visto)]" />
        <span>
          <span className="font-semibold">Publicado</span>
          <span className="block text-sm text-muted">Los alumnos solo ven los cursos publicados. Mientras tanto, es un borrador que ves solo vos.</span>
        </span>
      </label>
      <FormError message={error} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || !dirty} className={button}>
          {pending ? "Guardando…" : course ? "Guardar cambios" : "Crear el curso"}
        </button>
        {saved && !dirty && <span role="status" className="text-sm font-semibold text-visto">✓ Guardado</span>}
        {course &&
          (confirmDelete ? (
            <span className="ml-auto flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">¿Borrar el curso con todas sus secciones, recursos y comentarios?</span>
              <button type="button" onClick={remove} disabled={pending} className={buttonDanger}>Sí, borrar</button>
              <button type="button" onClick={() => setConfirmDelete(false)} className={buttonSecondary}>No</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className={`${buttonDanger} ml-auto`}>Borrar curso</button>
          ))}
      </div>
    </form>
  );
}
