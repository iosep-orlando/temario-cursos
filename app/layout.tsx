import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Las dos letras (licencia OFL) están en el repo: compilar no depende de la red.
const schibsted = localFont({
  src: "./fonts/schibsted-grotesk-variable.woff2",
  variable: "--font-schibsted",
  weight: "400 900",
  display: "swap",
});
const literata = localFont({
  src: [
    { path: "./fonts/literata-variable.woff2", style: "normal" },
    { path: "./fonts/literata-variable-italic.woff2", style: "italic" },
  ],
  variable: "--font-literata",
  weight: "200 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Temario · Cursos en orden", template: "%s · Temario" },
  description: "Una plataforma de cursos: el admin arma el temario en Markdown y los alumnos lo recorren en orden y dejan su opinión.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${schibsted.variable} ${literata.variable} h-full antialiased`}>
      <body className="min-h-full bg-hoja font-sans text-tinta">{children}</body>
    </html>
  );
}
