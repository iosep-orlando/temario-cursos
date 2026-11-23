// Datos de ejemplo: cuatro cursos (tres publicados y un borrador) con
// secciones, recursos en Markdown y videos de YouTube, un admin, dos
// alumnos con avance y comentarios, y una chuleta en PDF en el bucket.
//
//   npx tsx scripts/seed.ts
//
// Lee .env.local. El admin es SEED_ADMIN_EMAIL, o el primero de
// ADMIN_EMAILS, o admin@temario.test; para que entre como admin, su email
// tiene que estar en ADMIN_EMAILS. Se puede correr las veces que quieras:
// borra y vuelve a crear SOLO estos cuatro cursos (los que hayas creado
// vos no se tocan).

import { existsSync } from "node:fs";
import { ObjectId } from "mongodb";
import { closeDb, collections, fileUrl, type FeedbackDoc, type ResourceDoc } from "../lib/db";
import { adminEmails, roleFor } from "../lib/roles";
import { fileKey, putObject } from "../lib/storage";
import { validateEmail } from "../lib/validation";

// Las variables se leen al conectar, no al importar: alcanza con cargarlas acá.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

/** Un PDF mínimo, armado a mano (una página de texto en Courier, para que las columnas queden alineadas). */
function tinyPdf(title: string, lines: string[]): Uint8Array {
  const esc = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`);
  const text = [
    "BT /F1 20 Tf 56 780 Td",
    `(${esc(title)}) Tj`,
    "/F1 12 Tf 0 -36 Td",
    ...lines.flatMap((l) => [`(${esc(l)}) Tj`, "0 -20 Td"]),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(text, "latin1")} >>\nstream\n${text}\nendstream`,
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(out, "latin1"));
}

type Res = { title: string; content: string };
type Course = { slug: string; title: string; description: string; published: boolean; sections: { title: string; resources: Res[] }[] };

const yt = (id: string) => `https://www.youtube.com/watch?v=${id}`;

function courses(cheatSheet: string | null): Course[] {
  return [
    {
      slug: "git-desde-cero",
      title: "Git desde cero",
      description: "Guardar versiones de tu código, volver atrás cuando algo se rompe y trabajar con ramas sin miedo.",
      published: true,
      sections: [
        {
          title: "Primeros pasos",
          resources: [
            {
              title: "¿Qué es Git?",
              content: `Git guarda **fotos** de tu proyecto a lo largo del tiempo. Cada foto es un *commit*: si algo se rompe, volvés a una foto anterior.

Para arrancar, este video de 100 segundos (en inglés, con subtítulos automáticos):

${yt("hwP7WQkmECE")}

## Las tres zonas

| Zona | Qué hay |
|---|---|
| Directorio de trabajo | Tus archivos, como los ves |
| *Staging* | Lo que preparaste para el próximo commit |
| Repositorio | La historia de commits |

> Git no es GitHub: Git es la herramienta; GitHub y GitLab son sitios donde guardar repositorios.`,
            },
            {
              title: "Instalar y configurar",
              content: `Instalá Git desde [git-scm.com](https://git-scm.com/downloads) y, la primera vez, decile quién sos:

\`\`\`bash
git config --global user.name "Tu Nombre"
git config --global user.email "vos@ejemplo.com"
\`\`\`

Comprobá que quedó:

\`\`\`bash
git --version
git config --list
\`\`\`

En Windows conviene usar **Git Bash** o WSL: los comandos de este curso son los de una terminal de Linux.`,
            },
            {
              title: "Tu primer commit",
              content: `Dentro de una carpeta nueva:

1. \`git init\` crea el repositorio
2. \`git add README.md\` prepara el archivo
3. \`git commit -m "Primer commit"\` guarda la foto

Después, \`git log --oneline\` te muestra la historia.

- [x] Instalar Git
- [x] Configurar nombre y email
- [ ] Hacer el primer commit`,
            },
          ],
        },
        {
          title: "Ramas",
          resources: [
            {
              title: "Crear y cambiar de rama",
              content: `Una rama es una línea de trabajo aparte: probás algo sin tocar lo que ya funciona.

\`\`\`bash
git switch -c nueva-funcion   # crea la rama y se pasa a ella
git switch main               # vuelve a main
git branch                    # lista las ramas
\`\`\``,
            },
            {
              title: "Fusionar sin miedo",
              content: `Cuando la rama está lista, se fusiona en \`main\`:

\`\`\`bash
git switch main
git merge nueva-funcion
\`\`\`

Si los dos lados tocaron las mismas líneas, Git marca un **conflicto**: abrís el archivo, elegís qué queda, y hacés \`git add\` y \`git commit\`.
${cheatSheet ? `\nPara tener a mano: ${cheatSheet}\n` : ""}`,
            },
          ],
        },
      ],
    },
    {
      slug: "nextjs-con-app-router",
      title: "Next.js con App Router",
      description: "De componentes de React a una app completa: rutas, Server y Client Components, y TypeScript.",
      published: true,
      sections: [
        {
          title: "Fundamentos de React",
          resources: [
            { title: "React en 100 segundos", content: `Un repaso rápido antes de Next.js:\n\n${yt("Tn6-PIqc4UM")}\n\nLa idea clave: la interfaz es una **función del estado**. Cambia el estado, React vuelve a dibujar.` },
            {
              title: "Componentes y props",
              content: `Un componente es una función que devuelve lo que se ve:

\`\`\`tsx
function Saludo({ nombre }: { nombre: string }) {
  return <p>Hola, {nombre}</p>;
}
\`\`\`

Las *props* son sus parámetros: \`<Saludo nombre="Ana" />\`.`,
            },
          ],
        },
        {
          title: "Next.js",
          resources: [
            { title: "Next.js en 100 segundos", content: `${yt("Sklc_fQBmcs")}\n\nEn el App Router, cada carpeta dentro de \`app/\` es una ruta, y \`page.tsx\` es lo que se muestra.` },
            {
              title: "Server y Client Components",
              content: `| | Server Component | Client Component |
|---|---|---|
| Dónde corre | En el servidor | En el navegador |
| Puede leer la base | Sí, directo | No: llama a la API |
| Puede usar \`useState\` | No | Sí |
| Cómo se marca | Por defecto | \`"use client"\` arriba |

Regla práctica: **leer en el servidor, interactuar en el cliente**.`,
            },
            { title: "TypeScript sin miedo", content: `${yt("zQnBQ4tB3ZA")}\n\nTypeScript te avisa los errores **antes** de ejecutar: si una función espera un número y le pasás un texto, el editor lo marca.` },
          ],
        },
      ],
    },
    {
      slug: "mongodb-para-empezar",
      title: "MongoDB para empezar",
      description: "Documentos, colecciones, consultas e índices: lo necesario para usar MongoDB en tus proyectos.",
      published: true,
      sections: [
        {
          title: "Documentos y colecciones",
          resources: [
            { title: "MongoDB en 100 segundos", content: `${yt("-bt_y4Loofg")}\n\nUn **documento** es un objeto JSON; una **colección** es un conjunto de documentos parecidos.` },
            {
              title: "Consultas básicas",
              content: `\`\`\`js
db.cursos.find({ published: true })          // todos los publicados
db.cursos.findOne({ slug: "git-desde-cero" }) // uno
db.secciones.find({ courseId }).sort({ order: 1 })
\`\`\`

Fijate en el último: así se listan las secciones **en orden**.`,
            },
          ],
        },
        {
          title: "Índices",
          resources: [
            {
              title: "Por qué un índice",
              content: `Sin índice, MongoDB revisa **todos** los documentos para encontrar los que buscás. Con un índice, va directo.

\`\`\`js
db.secciones.createIndex({ courseId: 1, order: 1 })
\`\`\`

Este índice sirve para la consulta del recurso anterior: filtra por curso y ya devuelve en orden.`,
            },
          ],
        },
      ],
    },
    {
      slug: "docker-para-el-dia-a-dia",
      title: "Docker para el día a día",
      description: "Contenedores para levantar MongoDB, MailHog y RustFS sin instalar nada. (Borrador: todavía no lo ven los alumnos.)",
      published: false,
      sections: [
        { title: "Lo básico", resources: [{ title: "¿Qué es un contenedor?", content: `${yt("Gjnup-PuquQ")}\n\nUn contenedor es un programa con todo lo que necesita para correr, aislado del resto.` }] },
      ],
    },
  ];
}

async function main() {
  const admin = validateEmail(process.env.SEED_ADMIN_EMAIL || adminEmails()[0] || "admin@temario.test");
  if (!admin.ok) throw new Error("SEED_ADMIN_EMAIL no es un email válido.");
  const { users, courses: coursesCol, sections, resources, feedback, progress, files } = await collections();
  const now = new Date();

  const user = async (email: string, name: string) =>
    (await users.findOneAndUpdate(
      { email },
      { $set: { name, role: roleFor(email) }, $setOnInsert: { email, createdAt: now } },
      { upsert: true, returnDocument: "after" },
    ))!;
  const adminUser = await user(admin.value, "Admin");
  const ana = await user("alumna@temario.test", "Ana Gómez");
  const bruno = await user("bruno@temario.test", "Bruno Díaz");

  // La chuleta en PDF, en el bucket. Si RustFS no está levantado, se sigue sin ella.
  let cheatSheet: string | null = null;
  try {
    const _id = new ObjectId();
    const bytes = tinyPdf("Chuleta de Git", [
      "git init              crea un repositorio",
      "git add <archivo>     prepara un cambio",
      "git commit -m \"...\"   guarda una foto",
      "git switch -c <rama>  crea una rama y se pasa",
      "git merge <rama>      trae los cambios de otra rama",
      "git log --oneline     la historia, corta",
    ]);
    await putObject(fileKey(_id.toString()), bytes, "application/pdf");
    await files.insertOne({ _id, filename: "chuleta-git.pdf", contentType: "application/pdf", size: bytes.length, key: fileKey(_id.toString()), uploadedBy: adminUser._id, createdAt: now });
    cheatSheet = `[📄 chuleta-git.pdf](${fileUrl(_id.toString(), "chuleta-git.pdf")})`;
  } catch (error) {
    console.warn("Sin la chuleta en PDF: no se pudo conectar con el almacenamiento S3 (", error instanceof Error ? error.message : error, ")");
  }

  const data = courses(cheatSheet);
  // De cero, solo los cursos de ejemplo.
  const old = await coursesCol.find({ slug: { $in: data.map((c) => c.slug) } }).toArray();
  const oldIds = old.map((c) => c._id);
  await Promise.all([
    sections.deleteMany({ courseId: { $in: oldIds } }),
    resources.deleteMany({ courseId: { $in: oldIds } }),
    feedback.deleteMany({ courseId: { $in: oldIds } }),
    progress.deleteMany({ courseId: { $in: oldIds } }),
  ]);
  await coursesCol.deleteMany({ _id: { $in: oldIds } });

  const byTitle = new Map<string, ResourceDoc & { _id: ObjectId }>();
  for (const [ci, course] of data.entries()) {
    const created = new Date(now.getTime() - (data.length - ci) * 86_400_000);
    const { insertedId: courseId } = await coursesCol.insertOne({
      title: course.title,
      slug: course.slug,
      description: course.description,
      published: course.published,
      createdAt: created,
      updatedAt: created,
    });
    for (const [si, section] of course.sections.entries()) {
      const { insertedId: sectionId } = await sections.insertOne({ courseId, title: section.title, order: si + 1 });
      for (const [ri, r] of section.resources.entries()) {
        const doc: ResourceDoc = { courseId, sectionId, title: r.title, order: ri + 1, content: r.content, createdAt: created, updatedAt: created };
        const { insertedId } = await resources.insertOne(doc);
        byTitle.set(r.title, { _id: insertedId, ...doc });
      }
    }
  }

  // Avance de Ana: los dos primeros de Git y el primero de Next.js.
  for (const title of ["¿Qué es Git?", "Instalar y configurar", "React en 100 segundos"]) {
    const r = byTitle.get(title)!;
    await progress.insertOne({ userId: ana._id, courseId: r.courseId, resourceId: r._id, completedAt: now });
  }

  const fb = (u: ObjectId, title: string, text: string, helpful: boolean | null, minutesAgo: number, reply?: string): FeedbackDoc => {
    const r = byTitle.get(title)!;
    return {
      resourceId: r._id,
      courseId: r.courseId,
      userId: u,
      text,
      helpful,
      reply: reply ? { text: reply, repliedAt: new Date(now.getTime() - (minutesAgo - 30) * 60_000), repliedBy: adminUser._id } : null,
      createdAt: new Date(now.getTime() - minutesAgo * 60_000),
    };
  };
  await feedback.insertMany([
    fb(ana._id, "¿Qué es Git?", "La tabla de las tres zonas me aclaró todo. ¡Gracias!", true, 300, "¡Qué bueno! En la sección de ramas se usa mucho el staging."),
    fb(ana._id, "Instalar y configurar", "", true, 200),
    fb(bruno._id, "Instalar y configurar", "En Windows, git config me dice que no encuentra el comando.", false, 120),
    fb(bruno._id, "React en 100 segundos", "El video está en inglés y va muy rápido.", false, 90),
    fb(ana._id, "React en 100 segundos", "", true, 60),
  ]);

  console.log(`Cursos: ${data.length} (${data.filter((c) => c.published).length} publicados). Recursos: ${byTitle.size}.`);
  console.log(`Admin: ${admin.value}. Alumnos: alumna@temario.test (con avance) y bruno@temario.test.`);
  if (roleFor(admin.value) !== "admin") {
    console.warn(`OJO: ${admin.value} no está en ADMIN_EMAILS, así que va a entrar como alumno. Agregalo en .env.local.`);
  }
  console.log("Listo. Entrá en http://localhost:3000/login y buscá el enlace en MailHog (http://localhost:8025).");
  await closeDb();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await closeDb();
  process.exit(1);
});
