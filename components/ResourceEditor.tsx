"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, errorMessage } from "@/lib/fetcher";
import { MAX_FILE_BYTES, markdownFor } from "@/lib/files";
import { formatBytes } from "@/lib/format";
import { youtubeId } from "@/lib/markdown";
import type { FileDTO, ResourceDTO } from "@/lib/types";
import FormError from "./FormError";
import Markdown from "./Markdown";
import { button, buttonDanger, buttonSecondary, input, label, linkButton } from "./ui";

/**
 * El editor de un recurso: Markdown a la izquierda y, a la derecha, cómo lo
 * va a ver el alumno (el mismo componente que usa su página). Desde la
 * barra se inserta un video de YouTube o un archivo subido al bucket.
 */
export default function ResourceEditor({ resource, courseHref, studentHref }: { resource: ResourceDTO; courseHref: string; studentHref: string }) {
  const router = useRouter();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const [saved, setSaved] = useState({ title: resource.title, content: resource.content });
  const [title, setTitle] = useState(resource.title);
  const [content, setContent] = useState(resource.content);
  const [view, setView] = useState<"write" | "preview">("write");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [tool, setTool] = useState<null | "video" | "file">(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = title !== saved.title || content !== saved.content;

  // Avisar antes de cerrar la pestaña con cambios sin guardar.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /** Inserta texto donde está el cursor, en su propio renglón. */
  function insert(snippet: string) {
    const el = textarea.current;
    const start = el?.selectionStart ?? content.length;
    const end = el?.selectionEnd ?? content.length;
    const before = content.slice(0, start);
    const after = content.slice(end);
    const block = `${before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : ""}${snippet}\n\n`;
    setContent(before + block + after.replace(/^\n+/, ""));
    setJustSaved(false);
    setTool(null);
    setView("write");
    requestAnimationFrame(() => {
      el?.focus();
      const pos = (before + block).length;
      el?.setSelectionRange(pos, pos);
    });
  }

  async function save(event?: FormEvent) {
    event?.preventDefault();
    setPending(true);
    setError(null);
    try {
      const updated = await api<ResourceDTO>(`/api/resources/${resource.id}`, { method: "PUT", json: { title, content } });
      setSaved({ title: updated.title, content: updated.content });
      setTitle(updated.title);
      setContent(updated.content);
      setJustSaved(true);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    try {
      await api(`/api/resources/${resource.id}`, { method: "DELETE" });
      router.push(courseHref);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4" aria-label="Editar recurso">
      <div>
        <label htmlFor="r-title" className={label}>Título</label>
        <input id="r-title" required maxLength={150} value={title} onChange={(e) => { setJustSaved(false); setTitle(e.target.value); }} className={`${input} text-lg font-bold`} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setTool(tool === "video" ? null : "video")} aria-expanded={tool === "video"} className={buttonSecondary}>Video de YouTube</button>
        <button type="button" onClick={() => setTool(tool === "file" ? null : "file")} aria-expanded={tool === "file"} className={buttonSecondary}>PDF o imagen</button>
        <span className="ml-auto flex rounded-md border border-line bg-white p-0.5 lg:hidden" role="group" aria-label="Vista">
          {(["write", "preview"] as const).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`rounded px-3 py-1 text-sm font-semibold ${view === v ? "bg-tinta text-white" : ""}`}>
              {v === "write" ? "Escribir" : "Vista previa"}
            </button>
          ))}
        </span>
      </div>
      {tool === "video" && <VideoTool onInsert={insert} />}
      {tool === "file" && <FileTool onInsert={insert} />}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={view === "preview" ? "hidden lg:block" : ""}>
          <label htmlFor="r-content" className="sr-only">Contenido en Markdown</label>
          <textarea
            id="r-content"
            ref={textarea}
            value={content}
            onChange={(e) => { setJustSaved(false); setContent(e.target.value); }}
            spellCheck
            className={`${input} h-[32rem] resize-y font-mono text-sm leading-relaxed lg:h-[40rem]`}
          />
          <p className="mt-1 text-xs text-muted">
            Markdown: **negrita**, # títulos, - listas, | tablas |, ```código```. Un enlace de YouTube solo en su renglón se ve como video.
          </p>
        </div>
        <div className={`${view === "write" ? "hidden lg:block" : ""} h-[32rem] overflow-y-auto rounded-md border border-line bg-white p-5 lg:h-[40rem]`} aria-label="Vista previa">
          <p className="mb-3 text-xs font-bold text-margen">Vista previa: así lo ve el alumno</p>
          <Markdown content={content} />
        </div>
      </div>

      <FormError message={error} />
      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-hoja/95 px-4 py-3 backdrop-blur">
        {dirty || pending ? (
          <button type="submit" disabled={pending} className={button}>{pending ? "Guardando…" : "Guardar cambios"}</button>
        ) : (
          <span role="status" className="text-sm font-semibold text-visto">{justSaved ? "✓ Guardado" : "✓ Sin cambios"}</span>
        )}
        {dirty && !pending && <span className="text-sm text-muted">Hay cambios sin guardar.</span>}
        <Link href={studentHref} className={linkButton}>Ver como alumno</Link>
        <Link href={courseHref} className={linkButton}>Volver al curso</Link>
        {confirmDelete ? (
          <span className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">¿Borrar el recurso y sus comentarios?</span>
            <button type="button" onClick={remove} disabled={pending} className={buttonDanger}>Sí, borrar</button>
            <button type="button" onClick={() => setConfirmDelete(false)} className={buttonSecondary}>No</button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className={`${buttonDanger} ml-auto`}>Borrar recurso</button>
        )}
      </div>
    </form>
  );
}

function VideoTool({ onInsert }: { onInsert: (snippet: string) => void }) {
  const [url, setUrl] = useState("");
  const id = youtubeId(url.trim());
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-md bg-white p-3 ring-1 ring-line">
      <div className="min-w-64 flex-1">
        <label htmlFor="yt" className={label}>Enlace del video</label>
        <input id="yt" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" className={input} />
      </div>
      <button type="button" disabled={!id} onClick={() => onInsert(`https://www.youtube.com/watch?v=${id}`)} className={button}>Insertar</button>
      {url.trim() && !id && <p className="w-full text-sm text-margen">Ese enlace no es de un video de YouTube.</p>}
    </div>
  );
}

function FileTool({ onInsert }: { onInsert: (snippet: string) => void }) {
  const [files, setFiles] = useState<FileDTO[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api<{ files: FileDTO[] }>("/api/files")
      .then((data) => alive && setFiles(data.files))
      .catch((err) => alive && setError(errorMessage(err)));
    return () => {
      alive = false;
    };
  }, []);

  async function upload(file: File) {
    setError(null);
    if (file.size > MAX_FILE_BYTES) return setError("El archivo puede pesar hasta 10 MB.");
    setUploading(true);
    try {
      const created = await api<FileDTO>(`/api/files?nombre=${encodeURIComponent(file.name)}`, {
        method: "POST",
        body: file,
        headers: { "content-type": file.type || "application/octet-stream" },
      });
      onInsert(markdownFor(created));
    } catch (err) {
      setError(errorMessage(err));
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-md bg-white p-3 ring-1 ring-line">
      <label className={`${button} cursor-pointer`}>
        {uploading ? "Subiendo…" : "Subir un PDF o una imagen"}
        <input type="file" accept="application/pdf,image/png,image/jpeg,image/gif,image/webp" disabled={uploading} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} className="sr-only" />
      </label>
      <span className="ml-3 text-sm text-muted">Hasta 10 MB. Se guarda en el bucket y se inserta el enlace.</span>
      <FormError message={error} />
      {files && files.length > 0 && (
        <div>
          <p className="text-sm font-semibold">O insertá uno que ya subiste:</p>
          <ul className="mt-1 max-h-40 overflow-y-auto text-sm">
            {files.map((f) => (
              <li key={f.id}>
                <button type="button" onClick={() => onInsert(markdownFor(f))} className="flex w-full justify-between gap-3 rounded px-2 py-1 text-left hover:bg-hoja">
                  <span className="truncate">{f.contentType === "application/pdf" ? "📄" : "🖼️"} {f.filename}</span>
                  <span className="shrink-0 text-muted">{formatBytes(f.size)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
