import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { button, linkButton, pageTitle, panel } from "@/components/ui";
import { formatDateTime, plural } from "@/lib/format";
import { pageAdmin } from "@/lib/page-auth";
import { adminStats } from "@/lib/store/admin";
import { listCourses } from "@/lib/store/courses";
import { worstRated } from "@/lib/store/feedback";

export const metadata: Metadata = { title: "Panel" };

export default function AdminPage() {
  return (
    <main>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={pageTitle}>Panel</h1>
        <Link href="/admin/cursos/nuevo" className={button}>Nuevo curso</Link>
      </div>
      <Suspense fallback={<p className="mt-6 text-muted">Cargando…</p>}>
        <Dashboard />
      </Suspense>
    </main>
  );
}

// Server Component: lee MongoDB directamente.
async function Dashboard() {
  await pageAdmin();
  const [stats, courses, worst] = await Promise.all([adminStats(), listCourses({ role: "admin" }), worstRated()]);

  return (
    <div className="mt-6 space-y-6">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Cursos publicados" value={stats.published} note={stats.drafts ? plural(stats.drafts, "borrador", "borradores") : "ningún borrador"} />
        <Stat label="Alumnos" value={stats.students} note="cuentas con rol alumno" />
        <Stat label="Comentarios sin responder" value={stats.unanswered} href="/admin/comentarios" alert={stats.unanswered > 0} />
        <Stat label="«No me sirvió»" value={stats.unhelpful} href="/admin/comentarios?filtro=unhelpful" alert={stats.unhelpful > 0} />
      </dl>

      <section className={`${panel} p-5`}>
        <h2 className="text-lg font-extrabold">Cursos</h2>
        {courses.length === 0 ? (
          <p className="mt-2 text-muted">Todavía no hay cursos. <Link href="/admin/cursos/nuevo" className={linkButton}>Creá el primero</Link>.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th className="py-2 pr-3 font-semibold">Curso</th>
                  <th className="py-2 pr-3 font-semibold">Estado</th>
                  <th className="py-2 pr-3 text-right font-semibold">Secciones</th>
                  <th className="py-2 pr-3 text-right font-semibold">Recursos</th>
                  <th className="py-2 pr-3 font-semibold">Modificado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {courses.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 pr-3">
                      <Link href={`/admin/cursos/${c.id}`} className="font-semibold hover:underline">{c.title}</Link>
                    </td>
                    <td className="py-2 pr-3">
                      {c.published ? (
                        <span className="rounded-full bg-visto/10 px-2 py-0.5 text-xs font-bold text-visto">Publicado</span>
                      ) : (
                        <span className="rounded-full bg-resaltador px-2 py-0.5 text-xs font-bold">Borrador</span>
                      )}
                    </td>
                    <td className="tabular py-2 pr-3 text-right">{c.sections}</td>
                    <td className="tabular py-2 pr-3 text-right">{c.resources}</td>
                    <td className="py-2 pr-3 text-muted">{formatDateTime(c.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={`${panel} p-5`}>
        <h2 className="text-lg font-extrabold">Recursos para revisar</h2>
        <p className="text-sm text-muted">Los que más alumnos marcaron como «no me sirvió».</p>
        {worst.length === 0 ? (
          <p className="mt-3 text-muted">Ningún recurso tiene votos negativos.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {worst.map((r) => (
              <li key={r.resourceId} className="flex flex-wrap items-center justify-between gap-3 py-2">
                <span>
                  <Link href={`/admin/recursos/${r.resourceId}`} className="font-semibold hover:underline">{r.title}</Link>
                  <span className="text-sm text-muted"> en {r.courseTitle}</span>
                </span>
                <span className="tabular text-sm">
                  <span className="font-semibold text-margen">{r.no} no</span>
                  <span className="text-muted"> / </span>
                  <span className="font-semibold text-visto">{r.yes} sí</span>
                  {r.comments > 0 && <span className="text-muted">, {plural(r.comments, "comentario", "comentarios")}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, note, href, alert = false }: { label: string; value: number; note?: string; href?: string; alert?: boolean }) {
  return (
    <div className={`${panel} relative p-4 ${href ? "hover:border-tinta/30" : ""}`}>
      <dt className="text-sm text-muted">
        {href ? <Link href={href} className="after:absolute after:inset-0">{label}</Link> : label}
      </dt>
      <dd className={`tabular mt-1 text-3xl font-extrabold ${alert ? "text-margen" : ""}`}>{value}</dd>
      {note && <dd className="mt-1 text-xs text-muted">{note}</dd>}
    </div>
  );
}
