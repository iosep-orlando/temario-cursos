import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Suspense } from "react";
import Check from "@/components/Check";
import Logo from "@/components/Logo";
import Markdown from "@/components/Markdown";
import { button, buttonSecondary } from "@/components/ui";
import { SESSION_COOKIE, verifySession } from "@/lib/jwt";
import { homeFor } from "@/lib/next-url";

export const metadata: Metadata = { title: { absolute: "Temario · Cursos en orden" } };

// La landing pública. Hecha con la skill frontend-design: la idea es el
// cuaderno y su índice (renglones, la línea roja del margen, el
// resaltador sobre "por acá vas"), porque lo que distingue a la
// plataforma es justamente el orden del contenido.
export default function LandingPage() {
  return (
    <div className="overflow-x-clip">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5">
        <Logo />
        <Suspense fallback={<Link href="/login" className={buttonSecondary}>Entrar</Link>}>
          <HeaderAction />
        </Suspense>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-6 lg:grid-cols-[1.05fr_1fr] lg:pt-14">
          <div>
            <h1 className="display text-6xl sm:text-7xl lg:text-8xl">
              Cada curso,
              <br />
              en su orden.
            </h1>
            <p className="mt-6 max-w-xl font-serif text-xl leading-relaxed text-muted">
              Quien enseña arma el temario: secciones, recursos en Markdown, videos y PDFs. Quien aprende lo recorre paso
              a paso, marca lo que ya vio y cuenta qué le sirvió.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/login" className={`${button} px-6 py-3 text-lg`}>Entrar con tu email</Link>
              <a href="#como" className="px-2 py-3 font-semibold text-birome hover:underline">Cómo funciona</a>
            </div>
            <p className="mt-3 text-sm text-muted">Sin contraseña: te llega un enlace al correo.</p>
          </div>
          <HeroIndice />
        </section>

        <section id="como" className="border-y border-line bg-white">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 md:grid-cols-2">
            <div className="border-l-2 border-margen pl-6">
              <h2 className="display text-3xl sm:text-4xl">Si armás el curso</h2>
              <ul className="mt-5 space-y-3 font-serif text-lg">
                <li>Creás cursos, secciones y recursos, y los ordenás con dos flechas.</li>
                <li>Escribís en Markdown y ves al lado cómo le va a quedar al alumno.</li>
                <li>Pegás un enlace de YouTube y aparece el video; subís un PDF y queda enlazado.</li>
                <li>Leés qué recursos no sirvieron y respondés cada comentario.</li>
              </ul>
            </div>
            <div className="border-l-2 border-birome pl-6">
              <h2 className="display text-3xl sm:text-4xl">Si lo cursás</h2>
              <ul className="mt-5 space-y-3 font-serif text-lg">
                <li>Ves los cursos publicados y su índice completo.</li>
                <li>Avanzás recurso por recurso, con el anterior y el siguiente a mano.</li>
                <li>Marcás lo visto, y la próxima vez seguís donde quedaste.</li>
                <li>Decís si te sirvió y dejás tu comentario; la respuesta te llega ahí mismo.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="display text-4xl sm:text-5xl">Markdown, y nada más</h2>
          <p className="mt-4 max-w-2xl font-serif text-lg text-muted">
            Sin editores que se rompen ni formatos raros: texto plano que cualquiera puede escribir, con títulos, listas,
            tablas y código. A la izquierda, lo que escribe quien arma el curso; a la derecha, lo que ve el alumno.
          </p>
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <pre className="overflow-x-auto rounded-lg bg-tinta p-6 text-sm leading-relaxed text-white/90">
              <code>{SAMPLE}</code>
            </pre>
            <div className="rounded-lg border border-line bg-white p-6">
              <div className="border-l-2 border-margen/50 pl-5">
                <Markdown content={SAMPLE} />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted">
          <Logo />
          <p>Proyecto 1.3.140 de CodeCrypto Academy. Next.js, MongoDB, Markdown y RustFS.</p>
        </div>
      </footer>
    </div>
  );
}

const SAMPLE = `## Tu primer commit

Antes de guardar, Git necesita saber **qué** cambios entran:

1. \`git add archivo.txt\` los prepara
2. \`git commit -m "Primer commit"\` los guarda

| Comando | Qué hace |
|---|---|
| \`git status\` | Muestra qué cambió |
| \`git log\` | La historia de commits |

- [x] Instalar Git
- [ ] Hacer el primer commit`;

/** Con sesión, el botón lleva al inicio de su rol; sin sesión, a entrar. */
async function HeaderAction() {
  const jwt = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = jwt ? await verifySession(jwt) : null;
  return session ? (
    <Link href={homeFor(session.role)} className={button}>{session.role === "admin" ? "Ir al panel" : "Ir a mis cursos"}</Link>
  ) : (
    <Link href="/login" className={buttonSecondary}>Entrar</Link>
  );
}

const HERO = [
  { title: "Primeros pasos", items: [["¿Qué es Git?", true], ["Instalar y configurar", true], ["Tu primer commit", false]] },
  { title: "Ramas", items: [["Crear y cambiar de rama", false], ["Fusionar sin miedo", false]] },
] as const;

/** El índice de la portada: una hoja cuadriculada con su margen, lo visto tildado y el resaltador en "por acá vas". */
function HeroIndice() {
  return (
    <div className="cuadriculado relative mx-auto w-full max-w-lg rounded-lg border border-line bg-white p-6 shadow-[0_18px_40px_-28px_rgba(21,32,59,0.5)] sm:p-8" role="img" aria-label="Ejemplo del índice de un curso, con dos recursos vistos y el tercero resaltado">
      <div className="absolute inset-y-0 left-10 w-0.5 bg-margen/60 sm:left-12" aria-hidden="true" />
      <div className="relative pl-8 sm:pl-10" aria-hidden="true">
        <p className="text-2xl font-extrabold tracking-tight">Git desde cero</p>
        <div className="mt-3 flex items-center gap-3 text-sm">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
            <div className="h-full w-2/5 rounded-full bg-visto" />
          </div>
          <span className="tabular font-semibold">40 %</span>
        </div>
        <ol className="mt-6 space-y-5">
          {HERO.map((section, si) => (
            <li key={section.title}>
              <p className="font-extrabold"><span className="tabular mr-3 text-birome">{si + 1}</span>{section.title}</p>
              <ol className="mt-2 space-y-1.5 font-serif">
                {section.items.map(([title, done], ri) => {
                  const current = si === 0 && ri === 2;
                  return (
                    <li key={title} className="flex items-center gap-3">
                      <Check done={done} />
                      <span className="tabular w-7 font-sans text-sm text-muted">{si + 1}.{ri + 1}</span>
                      <span className={current ? "resaltado px-1" : ""}>{title}</span>
                      <span className="leader" />
                      {current && <span className="font-sans text-xs font-bold">por acá vas</span>}
                    </li>
                  );
                })}
              </ol>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
