/** El círculo del índice: vacío, o con el tilde verde si el recurso está visto. */
export default function Check({ done }: { done: boolean }) {
  return done ? (
    <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" aria-label="Visto" role="img">
      <circle cx="10" cy="10" r="9" fill="var(--color-visto)" />
      <path d="M6 10.5l2.6 2.6L14 7.6" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" aria-label="Sin ver" role="img">
      <circle cx="10" cy="10" r="8.5" fill="none" stroke="var(--color-line)" strokeWidth="2" />
    </svg>
  );
}
