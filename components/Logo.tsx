import Link from "next/link";

/** La marca: una hoja con la línea roja del margen y tres renglones, y el nombre. */
export default function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 self-start text-tinta">
      <svg viewBox="0 0 20 24" aria-hidden="true" className="h-6 w-5 shrink-0">
        <rect x="0.75" y="0.75" width="18.5" height="22.5" rx="2" fill="white" stroke="var(--color-tinta)" strokeWidth="1.5" />
        <line x1="5.5" y1="1" x2="5.5" y2="23" stroke="var(--color-margen)" strokeWidth="1.5" />
        {[7, 12, 17].map((y) => (
          <line key={y} x1="8" y1={y} x2="16" y2={y} stroke="var(--color-birome)" strokeWidth="1.6" strokeLinecap="round" />
        ))}
      </svg>
      <span className="text-xl font-extrabold tracking-tight">Temario</span>
    </Link>
  );
}
