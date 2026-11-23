// ---------------------------------------------------------------------------
// Tipos compartidos por el servidor y el navegador. Los documentos de
// MongoDB (con ObjectId y Date) están en lib/db.ts; acá, lo que viaja como
// JSON (DTO): ids como texto, fechas como texto ISO.
//
// La jerarquía: Curso → Secciones → Recursos. Secciones y recursos llevan
// `order`, y todo se lista ordenado por ese campo.
// ---------------------------------------------------------------------------

export type Role = "admin" | "student";

export interface MeDTO {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface CourseDTO {
  id: string;
  title: string;
  slug: string;
  description: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SectionDTO {
  id: string;
  courseId: string;
  title: string;
  order: number;
}

/** Un recurso sin su contenido: para índices y listas. */
export interface ResourceSummaryDTO {
  id: string;
  sectionId: string;
  courseId: string;
  title: string;
  order: number;
}

export interface ResourceDTO extends ResourceSummaryDTO {
  content: string; // Markdown
  updatedAt: string;
}

/** El curso entero, ordenado: lo que se ve en el índice. */
export interface CourseOutlineDTO {
  course: CourseDTO;
  sections: (SectionDTO & { resources: ResourceSummaryDTO[] })[];
}

/** "¿Te sirvió?": sí, no, o sin responder. */
export type Helpful = boolean | null;

export interface FeedbackDTO {
  id: string;
  resourceId: string;
  courseId: string;
  userId: string;
  userEmail: string;
  userName: string;
  text: string;
  helpful: Helpful;
  reply: { text: string; repliedAt: string } | null;
  createdAt: string;
}

export interface FileDTO {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  url: string; // /api/files/<id>/<nombre>
  createdAt: string;
}

/** Avance de un alumno en un curso. */
export interface ProgressDTO {
  done: number;
  total: number;
  percent: number;
  completed: string[]; // ids de recursos vistos
  /** El primero que falta, en orden (null si terminó o el curso está vacío). */
  nextResourceId: string | null;
}
