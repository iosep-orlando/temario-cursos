# Temario · Plataforma de cursos

Una plataforma de cursos online con dos roles:

- **El admin** arma los cursos: secciones y recursos en Markdown, con videos de
  YouTube, PDFs e imágenes. Los ordena con flechas y lee el feedback de los
  alumnos.
- **El alumno** recorre los cursos publicados en orden, marca lo que ya vio,
  sigue donde quedó y dice si cada recurso le sirvió.

Se entra con un **enlace mágico** por mail, sin contraseña.

La landing pública se diseñó con la skill `frontend-design`. La idea es el
cuaderno y su índice: renglones, la línea roja del margen y el resaltador en
«por acá vas». Lo que distingue a la plataforma es justamente el orden del
contenido.

El enunciado original está en [README-enunciado.md](README-enunciado.md).

## Demo

Se publica en **https://temario-cursos.onrender.com** (pendiente: ver
«Despliegue»). Es el plan gratuito: si estuvo un rato sin visitas, tarda
unos 50 segundos en despertar.

| Para entrar como | Email |
|------------------|-------|
| Admin | `admin@demo.test` |
| Alumna con avance y comentarios | `alumna@temario.test` |
| Alumno nuevo | cualquier otro, por ejemplo `tu-nombre@demo.test` |

La demo no manda mails de verdad: el enlace para entrar aparece en la
**bandeja de demo** (`/bandeja`). Es pública, así que cualquiera puede entrar
como admin: no hay datos reales, y el seed la deja como nueva.

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 16 (App Router, Cache Components) + React 19 + TypeScript + Tailwind CSS 4 |
| Base de datos | MongoDB con el driver nativo, base `saas-cursos`, singleton en `lib/db.ts` |
| Markdown | `react-markdown` + `remark-gfm` + `rehype-raw`, limpiado con `rehype-sanitize` |
| Auth | Enlace mágico por email (Nodemailer → MailHog), sesión en JWT con el rol |
| Archivos | S3 con `@aws-sdk/client-s3`: RustFS en local; el bucket se crea si no existe |
| Estado global | `GlobalContext` de React: usuario y rol |
| Protección de rutas | `proxy.ts`, el sustituto de `middleware.ts` en Next.js 16 |
| Tests | Vitest + cobertura v8, en el pipeline de GitLab |

El enunciado nombra Next.js 16.2. Se usa la 16.4.6, la misma de los
proyectos anteriores; no hay cambios que afecten a lo que se pide.

## Cómo funciona

```
┌────────────────┐ Server Components leen MongoDB  ┌─────────────┐
│ Next.js        │ ──────────────────────────────► │ MongoDB     │
│ /cursos (alumno)│                                │ saas-cursos │
│ /admin  (admin) │ Client Components → /api/… ──► │             │
└────────────────┘                                 └─────────────┘
        │  proxy.ts: sesión, y rol admin para /admin
        │  /api/…: requireUser() o requireAdmin(), con el rol leído de la base
        ▼
  /api/auth/magic-link ──► Nodemailer ──► MailHog :1025
  /api/files ────────────► RustFS (S3), bucket privado: files/<id>
```

- **Server Components leen MongoDB directamente.** La lista de cursos, el
  índice, el recurso, el panel y los comentarios se arman en el servidor con
  `lib/store/`.
- **Client Components llaman a la API.** Marcar como visto, dejar feedback,
  el ABM y el orden, el editor y la subida de archivos van por `/api/…`. Los
  errores vuelven como `{ error: "…" }` con su código HTTP (400, 401, 403,
  404, 409, 413, 503).

### Modelo de datos

```
User     { email, name, role: "admin" | "student" }
Course   { title, slug, description, published }
Section  { courseId, title, order }                 ← en orden por `order`
Resource { courseId, sectionId, title, order,       ← Markdown
           content }
Feedback { resourceId, courseId, userId, text,      ← atado al recurso y al alumno
           helpful: true | false | null, reply }
Progress { userId, courseId, resourceId }           ← recurso visto (único por alumno)
File     { filename, contentType, size, key }       ← el contenido, en S3
```

Los índices acompañan las consultas de siempre: `sections {courseId, order}`
y `resources {sectionId, order}` devuelven ya ordenado; `courses.slug` y
`progress {userId, resourceId}` son únicos.

### Las pantallas

| Ruta | Quién | Qué |
|------|-------|-----|
| `/` | Todos | Landing |
| `/login`, `/auth/verify` | Todos | Ingreso con enlace mágico |
| `/cursos` | Alumno y admin | Cursos publicados (el admin ve también los borradores), con el avance |
| `/cursos/<slug>` | Alumno y admin | El índice del curso, lo visto y «seguir donde quedaste» |
| `/cursos/<slug>/<recurso>` | Alumno y admin | El recurso, anterior y siguiente, marcar como visto y feedback |
| `/admin` | Admin | Números, cursos y los recursos peor valorados |
| `/admin/cursos/nuevo`, `/admin/cursos/<id>` | Admin | Datos del curso, publicar, y el índice con flechas |
| `/admin/recursos/<id>` | Admin | Editor con vista previa, videos, archivos y el feedback del recurso |
| `/admin/comentarios` | Admin | Sin responder, «no me sirvió» o todos; responder y borrar |

## Cómo ejecutar

1. **MongoDB, MailHog y RustFS** en Docker: `docker compose up -d`. Si ya
   tenés alguno andando por otro proyecto, levantá solo lo que falta. Los
   puertos de RustFS se cambian así:
   `RUSTFS_S3_PORT=9050 RUSTFS_CONSOLE_PORT=9051 docker compose up -d rustfs`.
   Mailpit en lugar de MailHog sirve igual.
2. **`.env.local`** a partir de [`.env.example`](.env.example):

   ```env
   MONGODB_URI=mongodb://localhost:27017
   MONGODB_DB=saas-cursos
   ADMIN_EMAILS=admin@temario.test
   MAILHOG_HOST=localhost
   MAILHOG_PORT=1025
   AWS_USERNAME=rustfsadmin
   AWS_PASSWORD=rustfsadmin
   AWS_REGION=us-east-1
   AWS_URL=http://localhost:9001
   ```

   Si tu Mongo pide usuario y clave, poné la cadena completa en
   `MONGODB_URI`. `AWS_URL` es la API S3 de RustFS, no la consola.
3. Instalar, sembrar y arrancar:

   ```bash
   npm install
   npx tsx scripts/seed.ts
   npm run dev
   ```

4. Entrar en http://localhost:3000 con **`admin@temario.test`** (o con
   `alumna@temario.test` para ver el lado del alumno) y abrir el enlace
   desde MailHog (http://localhost:8025).

El seed crea:

- cuatro cursos: Git, Next.js y MongoDB publicados, y Docker como borrador;
- catorce recursos con videos de YouTube (verificados), tablas, código y
  listas de tareas;
- una **chuleta en PDF** subida a RustFS y enlazada desde un recurso;
- el admin y dos alumnos, con avance, votos y comentarios (uno respondido).

Se puede correr las veces que haga falta: rehace solo esos cuatro cursos, y
no toca los que hayas creado vos. Si RustFS no está levantado, sigue sin la
chuleta y lo avisa.

### Scripts

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Compilar y servir en producción (pide `JWT_SECRET`) |
| `npm test` / `npm run test:coverage` | Tests (con cobertura) |
| `npm run lint` / `npm run typecheck` | ESLint y TypeScript |
| `npm run seed` | Lo mismo que `npx tsx scripts/seed.ts` |

## Despliegue

La demo corre en **Render** (plan gratuito), con la base en **MongoDB
Atlas** y los archivos en **Supabase Storage**, que es compatible con S3. La
configuración está en [`render.yaml`](render.yaml).

| Pieza | Servicio | Plan |
|-------|----------|------|
| App Next.js | Render, servicio web (Virginia) | Free |
| Base de datos | MongoDB Atlas, AWS N. Virginia | Free (M0) |
| PDF e imágenes | Supabase Storage por S3, bucket `cursos` (us-east-1) | Free (1 GB) |
| Correo | Bandeja de demo en la propia base (`MAIL_TRANSPORT=outbox`) | Sin costo |

1. **Base.** El clúster de Atlas de otros proyectos sirve: esta app usa la
   base `saas-cursos`.
2. **Bucket.** En el proyecto de Supabase de Talonario, crear el bucket
   **privado** `cursos`. Sirven el mismo endpoint y la misma *access key*.
3. **Código en GitHub**, porque Render no se conecta al GitLab de la
   academia.
4. **Servicio.** En Render, *New → Blueprint* con ese repositorio. Render
   inventa `JWT_SECRET` y pide `MONGODB_URI`, `AWS_URL`, `AWS_USERNAME` y
   `AWS_PASSWORD`. `ADMIN_EMAILS=admin@demo.test`, `AWS_BUCKET=cursos` y
   `AWS_REGION=us-east-1` ya vienen en el `render.yaml`.
5. **Datos de ejemplo**, desde tu máquina. La cadena de Atlas se pide sin
   mostrarla, y las variables de la línea le ganan a las de `.env.local`:

   ```bash
   read -rs -p "Cadena de Atlas: " ATLAS; echo; read -rs -p "Access key ID: " AKID; echo; read -rs -p "Secret: " AKSEC; echo
   MONGODB_URI="$ATLAS" SEED_ADMIN_EMAIL=admin@demo.test ADMIN_EMAILS=admin@demo.test \
     AWS_URL=https://<proyecto>.storage.supabase.co/storage/v1/s3 AWS_BUCKET=cursos AWS_REGION=us-east-1 \
     AWS_USERNAME="$AKID" AWS_PASSWORD="$AKSEC" npx tsx scripts/seed.ts; unset ATLAS AKID AKSEC
   ```

## Tests y cobertura

```
npm test                 # 93 tests
npm run test:coverage    # con el informe en coverage/
```

| Archivo | Qué prueba |
|---------|------------|
| `markdown.test.ts` | GFM; videos de YouTube (enlace suelto e iframe, pasados a `youtube-nocookie`); quita scripts, `on…=`, `javascript:`, estilos e iframes ajenos; enlaces internos y externos |
| `validation.test.ts` | Slug desde el título, cursos, títulos, recursos, dirección para ordenar, feedback y respuesta |
| `course.test.ts` | Recorrido en orden cruzando secciones, anterior y siguiente, avance y «seguir donde quedaste», valoraciones |
| `files.test.ts` | Tipo por los bytes (un HTML con nombre `.pdf` no pasa), nombre limpio, qué se inserta |
| `auth.test.ts` | Roles por `ADMIN_EMAILS`, JWT con rol (y uno inventado no vale), `proxy.ts` por rol, redirección segura |
| `storage.test.ts`, `mail.test.ts` | Bucket que se crea si no existe, archivos, SMTP y bandeja de demo |

El pipeline (`.gitlab-ci.yml`) corre lint, tipos y tests con cobertura, y
publica el informe en GitLab. Sobre la lógica que no depende de la base, la
cobertura es 100 % de líneas y 96 % de ramas.

Las rutas de la API y `lib/store/` son consultas a MongoDB, así que se
probaron de punta a punta en el navegador, con base, SMTP y S3 simulados.

- **Como alumna:**
  - «seguir donde quedaste» lleva al primer recurso sin ver;
  - «Marcar como visto y seguir» avanza y actualiza el porcentaje;
  - el feedback se envía y aparece la respuesta del admin;
  - el video se ve, y la chuleta en PDF baja con su tipo.
- **Permisos:**
  - una alumna en `/admin` vuelve a `/cursos`;
  - crear un curso, listar feedback o archivos y borrar un curso dan 403;
  - el curso borrador da 404 y no aparece en la API;
  - sin sesión, la API y los archivos dan 401.
- **Como admin:**
  - responder un comentario;
  - crear un curso con secciones y recursos;
  - subir un recurso y una sección con las flechas;
  - escribir con vista previa, insertar un video y subir una imagen; un
    HTML disfrazado de PDF se rechaza;
  - publicar el curso.
- **De vuelta como alumno:**
  - el orden nuevo de las secciones se ve tal cual;
  - aparece la respuesta del admin;
  - la imagen subida carga.

## Decisiones de diseño

### 1. El orden: un número por elemento, y las flechas intercambian

**Contexto.** El enunciado pide secciones y recursos con `order` numérico, y
que el admin controle la secuencia.

**Decisión.**

- **Agregar.** Uno nuevo va al final: el `order` más alto del grupo, más 1.
- **Reordenar.** Subir o bajar intercambia el `order` con el vecino: dos
  `updateOne`.
- **Borrar.** Quedan huecos (1, 2, 4), y no importa: todo se lista con
  `sort({ order: 1 })` y en pantalla se numera 1, 2, 3.
- **Índices.** `{courseId, order}` y `{sectionId, order}` hacen que esa
  consulta venga ya ordenada.

**Consecuencias.**

- Mover un elemento toca dos documentos, en vez de renumerar todo el grupo.
- Sin transacción entre los dos `updateOne`: si se corta justo en el medio,
  dos elementos quedan con el mismo número y uno de los dos sale primero. Se
  arregla con otra flecha.
- Arrastrar y soltar habría pedido renumerar o usar números con decimales;
  las flechas alcanzan y son accesibles con teclado.

### 2. Markdown con HTML, pero limpio

**Contexto.** El enunciado pide `rehype-raw` para los iframes de YouTube.
Pero con HTML libre, un recurso podría tener `<script>` o
`onerror=` y ejecutar código en el navegador de todos los alumnos. Basta con
una cuenta de admin robada, o un copiar y pegar descuidado.

**Decisión.** Después de `rehype-raw`, el HTML pasa por dos filtros:

- **`rehype-sanitize`,** con la lista de GitHub más `iframe`: quita
  scripts, atributos `on…`, estilos y `javascript:`.
- **Un plugin propio** (`rehypeYoutube`): deja solo los iframes de YouTube,
  pasados a `youtube-nocookie`, que no deja cookies hasta que se da play.
  Cualquier otro iframe se cambia por un aviso.

Además, un enlace de YouTube solo en su renglón se convierte en el video:
el admin pega el enlace y listo, sin escribir HTML.

**Consecuencias.**

- El mismo componente `Markdown` arma la vista del alumno (en el servidor) y
  la vista previa del editor (en el navegador): el admin ve exactamente lo
  que verá el alumno.
- Videos de otros sitios (Vimeo, por ejemplo) no se incrustan: quedan como
  enlace.

### 3. Roles: lista de admins en una variable, y el rol de la base

**Contexto.** Hace falta decidir quién es admin sin que nadie pueda hacerse
admin desde la web.

**Decisión.**

- **Quién.** `ADMIN_EMAILS` lista los admins; cualquier otro que entra es
  alumno.
- **Cuándo.** El rol se calcula en cada ingreso, se guarda en el usuario y
  viaja en el JWT. Así `proxy.ts` frena a un alumno en `/admin` sin
  consultar la base.
- **Dónde se confirma.** La API y las páginas leen el rol **de la base**
  (`requireAdmin`), no del JWT.

**Consecuencias.**

- Sumar un admin es cambiar la variable y que entre de nuevo.
- Sacar uno: deja de ser admin en su próximo ingreso. Mientras tanto, si
  hiciera falta cortarlo ya, se cambia su rol en la base y pierde el acceso
  en la próxima petición.
- No hay pantalla de usuarios: no se pidió, y es una superficie menos para
  equivocarse.

### 4. Un alumno no ve los borradores: ni en la lista, ni por URL, ni por la API

**Decisión.** Un curso no publicado, para un alumno, **no existe**: da 404
en la página, en la API del curso, en la de sus recursos y en la del
feedback. El admin los ve (con una marca de «Borrador») para revisarlos
como alumno antes de publicar.

**Consecuencias.** Se comprueba en un solo lugar (`getCourseDoc` y
`getResourceDoc`), que usan todas las rutas.

### 5. Feedback: voto y comentario, con respuesta

**Contexto.** El enunciado pide el feedback atado al recurso «para que el
admin vea qué contenido funciona y cuál no».

**Decisión.**

- **Qué guarda.** Cada feedback lleva `resourceId`, `userId` (siempre de la
  sesión), un «¿te sirvió?» sí o no, y un comentario. Al menos una de las
  dos cosas.
- **Qué ve el admin.** Los recursos con más «no me sirvió», primero los de
  peor proporción. Puede responder; la respuesta la ve el alumno debajo de
  su comentario.
- **Qué ve el alumno.** Solo lo suyo, no lo de los demás.

**Consecuencias.** «Sin responder» cuenta solo los que tienen comentario: un
voto solo no se contesta.

### 6. Progreso: un documento por recurso visto

**Decisión.** `progress {userId, courseId, resourceId}` con índice único.
Marcar dos veces no duplica (`upsert`), y desmarcar lo borra. El avance se
calcula contra el índice **actual** del curso:

- un recurso borrado deja de contar;
- «seguir donde quedaste» lleva al primero que falta, en orden, aunque haya
  vistos más adelante.

**Consecuencias.** El porcentaje se recalcula en cada página, con dos
consultas; no hay un contador que mantener sincronizado.

### 7. Archivos en S3, servidos por la API

**Contexto.** El stack del enunciado incluye RustFS para archivos.

**Decisión.**

- **Subida.** El admin sube PDF o imágenes desde el editor: hasta 10 MB, y
  el tipo se reconoce por los **bytes** (un HTML con nombre `.pdf` no pasa).
  El archivo va al bucket como `files/<id>` y en el Markdown se inserta el
  enlace `/api/files/<id>/<nombre>`.
- **Lectura.** El bucket es privado: la API sirve el archivo **solo con
  sesión**, con su tipo y `nosniff`.

**Consecuencias.** En la demo, el mismo código usa Supabase Storage: solo
cambian las variables `AWS_*`, como en Talonario.

### 8. Ingreso con enlace mágico de un solo uso, con botón

**Decisión.**

- **El enlace.** 32 bytes al azar; en la base, solo su hash SHA-256. Vale
  15 minutos y una sola vez (canje atómico con `findOneAndUpdate`).
- **Límite.** Hasta 3 enlaces cada 10 minutos por email.
- **Un botón.** Abrir el enlace muestra un botón «Entrar»: los antivirus de
  correo abren los enlaces para revisarlos y lo gastarían.
- **Después de entrar,** se vuelve a la página pedida si le corresponde al
  rol (un alumno nunca va a `/admin`). Si no, al inicio de su rol.

### 9. Correo en la demo: una bandeja en la base

**Contexto.** Render gratis bloquea los puertos SMTP.

**Decisión.** Con `MAIL_TRANSPORT=outbox`, los mails se guardan en MongoDB
y se ven en `/bandeja`. En local, Nodemailer manda a MailHog
(`MAILHOG_HOST`, `MAILHOG_PORT`).

## Uso de IA

El proyecto se desarrolló con Claude como asistente de programación. Antes
de escribir código decidí cuatro cosas:

- los admins, por una lista en una variable de entorno;
- los extras: progreso del alumno, editor con vista previa, feedback con
  valoración y reordenar con flechas;
- subir archivos desde el editor a RustFS;
- y publicar la demo como Talonario.

Lo que se revisó y cambió sobre lo generado:

- **`rehype-raw` abre la puerta a HTML peligroso.** El enunciado lo pide para
  los iframes, así que se agregó `rehype-sanitize` y un filtro que deja solo
  YouTube. Hay tests con `<script>`, `onerror` y `javascript:` (decisión 2).
- **Los videos del seed se verificaron uno por uno** en YouTube (título y
  canal) antes de usarlos, para que el seed no traiga videos inexistentes.
- **Se probó un PDF falso:** un HTML renombrado `.pdf` se rechaza, porque el
  tipo se mira en los bytes (decisión 7).
- **Al servir los archivos se descartó la cabecera `CSP: sandbox`.** Aísla
  mejor, pero Chrome no muestra PDFs en un documento aislado.
- **Se probaron los permisos a propósito:** con una cuenta de alumno se
  intentó crear, listar y borrar como admin, y abrir un curso en borrador
  por URL y por la API.
- **Next.js 16 esconde las páginas en vez de cerrarlas** (como en los
  proyectos anteriores). Los formularios con datos del servidor se
  reinician por `key` cuando el dato cambió.

## Estructura

```
app/
  page.tsx                          landing pública
  login/, auth/verify/              ingreso con enlace mágico
  cursos/                           el lado del alumno: lista, índice y recurso
  admin/                            panel, curso (datos e índice), editor de recurso y comentarios
  bandeja/                          bandeja de demo (solo con MAIL_TRANSPORT=outbox)
  api/                              auth, courses, sections, resources (+ move, feedback, progress), feedback, files, outbox
components/                         Markdown, editores, feedback, cabecera…
lib/
  markdown.ts                       Markdown seguro y videos de YouTube
  course.ts                         recorrido en orden, avance, valoraciones (sin base)
  validation.ts, files.ts, roles.ts reglas de entrada, archivos y roles
  db.ts, store/                     MongoDB: colecciones y consultas
  auth.ts, jwt.ts, storage.ts       sesión con rol y S3
  context/GlobalContext.tsx         usuario y rol para el navegador
proxy.ts                            /cursos con sesión; /admin solo para admins
scripts/seed.ts                     datos de ejemplo
```
