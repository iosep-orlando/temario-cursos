"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/fetcher";
import { plural } from "@/lib/format";
import type { CourseOutlineDTO, ResourceSummaryDTO, SectionDTO } from "@/lib/types";
import FormError from "./FormError";
import { buttonSecondary, iconButton, input, linkButton, panel } from "./ui";

/**
 * El índice del curso para el admin: agregar, renombrar, borrar y ordenar
 * secciones y recursos. El orden se cambia con las flechas (intercambian el
 * número de orden con el vecino); después de cada cambio, el servidor
 * vuelve a mandar el índice.
 */
export default function OutlineEditor({ outline }: { outline: CourseOutlineDTO }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSection, setNewSection] = useState("");

  async function run(request: () => Promise<unknown>) {
    setPending(true);
    setError(null);
    try {
      await request();
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  function addSection(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      await api(`/api/courses/${outline.course.id}/sections`, { method: "POST", json: { title: newSection } });
      setNewSection("");
    });
  }

  return (
    <section className={`${panel} p-5`} aria-labelledby="indice-admin">
      <h2 id="indice-admin" className="text-lg font-extrabold">Índice</h2>
      <p className="text-sm text-muted">El orden de acá es el orden en que lo recorren los alumnos.</p>
      <div className="mt-3"><FormError message={error} /></div>
      <ol className="mt-3 space-y-4">
        {outline.sections.map((section, i) => (
          <SectionBlock
            key={section.id}
            section={section}
            index={i}
            isFirst={i === 0}
            isLast={i === outline.sections.length - 1}
            pending={pending}
            run={run}
          />
        ))}
      </ol>
      {outline.sections.length === 0 && <p className="mt-2 text-muted">Todavía no hay secciones. Empezá por la primera.</p>}
      <form onSubmit={addSection} className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
        <label htmlFor="new-section" className="sr-only">Nueva sección</label>
        <input id="new-section" value={newSection} onChange={(e) => setNewSection(e.target.value)} maxLength={150} placeholder="Título de la nueva sección" className={`${input} min-w-56 flex-1`} />
        <button type="submit" disabled={pending || !newSection.trim()} className={buttonSecondary}>Agregar sección</button>
      </form>
    </section>
  );
}

function Arrows({ label, isFirst, isLast, pending, onMove }: { label: string; isFirst: boolean; isLast: boolean; pending: boolean; onMove: (d: "up" | "down") => void }) {
  return (
    <span className="flex shrink-0">
      <button type="button" disabled={pending || isFirst} onClick={() => onMove("up")} aria-label={`Subir ${label}`} className={iconButton}>↑</button>
      <button type="button" disabled={pending || isLast} onClick={() => onMove("down")} aria-label={`Bajar ${label}`} className={iconButton}>↓</button>
    </span>
  );
}

function SectionBlock({
  section,
  index,
  isFirst,
  isLast,
  pending,
  run,
}: {
  section: SectionDTO & { resources: ResourceSummaryDTO[] };
  index: number;
  isFirst: boolean;
  isLast: boolean;
  pending: boolean;
  run: (request: () => Promise<unknown>) => Promise<void>;
}) {
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(section.title);
  const [newResource, setNewResource] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmResource, setConfirmResource] = useState<string | null>(null);

  return (
    <li className="rounded-md border border-line">
      <div className="flex flex-wrap items-center gap-2 bg-hoja px-3 py-2">
        <span className="tabular w-6 font-extrabold text-birome">{index + 1}</span>
        {renaming ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await api(`/api/sections/${section.id}`, { method: "PUT", json: { title } });
                setRenaming(false);
              });
            }}
            className="flex min-w-0 flex-1 gap-2"
          >
            <label htmlFor={`s-${section.id}`} className="sr-only">Título de la sección</label>
            <input id={`s-${section.id}`} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} className={`${input} py-1`} autoFocus />
            <button type="submit" disabled={pending || !title.trim()} className={linkButton}>Guardar</button>
            <button type="button" onClick={() => { setTitle(section.title); setRenaming(false); }} className="text-sm font-semibold text-muted">Cancelar</button>
          </form>
        ) : (
          <>
            <span className="min-w-0 flex-1 font-bold">{section.title}</span>
            <button type="button" onClick={() => setRenaming(true)} className="text-sm font-semibold text-muted hover:text-tinta">Renombrar</button>
          </>
        )}
        <Arrows label={`la sección ${section.title}`} isFirst={isFirst} isLast={isLast} pending={pending} onMove={(direction) => run(() => api(`/api/sections/${section.id}/move`, { method: "POST", json: { direction } }))} />
        {confirmDelete ? (
          <span className="flex w-full flex-wrap items-center justify-end gap-2 text-sm sm:w-auto">
            <span className="font-semibold">¿Borrar la sección{section.resources.length > 0 ? ` y ${plural(section.resources.length, "recurso", "recursos")}` : ""}?</span>
            <button type="button" disabled={pending} onClick={() => run(() => api(`/api/sections/${section.id}`, { method: "DELETE" }))} className="font-semibold text-margen hover:underline">Sí, borrar</button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="font-semibold text-muted hover:underline">No</button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} aria-label={`Borrar la sección ${section.title}`} className={`${iconButton} hover:text-margen`}>✕</button>
        )}
      </div>
      <ol className="divide-y divide-line">
        {section.resources.map((r, ri) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2 px-3 py-1.5">
            <span className="tabular w-10 text-sm text-muted">{index + 1}.{ri + 1}</span>
            <Link href={`/admin/recursos/${r.id}`} className="min-w-0 flex-1 font-serif hover:underline">{r.title}</Link>
            <Arrows label={`el recurso ${r.title}`} isFirst={ri === 0} isLast={ri === section.resources.length - 1} pending={pending} onMove={(direction) => run(() => api(`/api/resources/${r.id}/move`, { method: "POST", json: { direction } }))} />
            {confirmResource === r.id ? (
              <span className="flex items-center gap-2 text-sm">
                <span className="font-semibold">¿Borrar?</span>
                <button type="button" disabled={pending} onClick={() => run(() => api(`/api/resources/${r.id}`, { method: "DELETE" }))} className="font-semibold text-margen hover:underline">Sí</button>
                <button type="button" onClick={() => setConfirmResource(null)} className="font-semibold text-muted hover:underline">No</button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmResource(r.id)} aria-label={`Borrar el recurso ${r.title}`} className={`${iconButton} hover:text-margen`}>✕</button>
            )}
          </li>
        ))}
      </ol>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await api(`/api/sections/${section.id}/resources`, { method: "POST", json: { title: newResource } });
            setNewResource("");
          });
        }}
        className="flex flex-wrap gap-2 border-t border-line px-3 py-2"
      >
        <label htmlFor={`nr-${section.id}`} className="sr-only">Nuevo recurso en {section.title}</label>
        <input id={`nr-${section.id}`} value={newResource} onChange={(e) => setNewResource(e.target.value)} maxLength={150} placeholder="Título del nuevo recurso" className={`${input} min-w-48 flex-1 py-1`} />
        <button type="submit" disabled={pending || !newResource.trim()} className={`${linkButton} text-sm`}>Agregar recurso</button>
      </form>
    </li>
  );
}
