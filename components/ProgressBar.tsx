/** Barra fina de avance: verde lo visto, sobre la línea gris. El número va al lado, en texto. */
export default function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={label}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"
      >
        <div className="h-full rounded-full bg-visto" style={{ width: `${percent}%` }} />
      </div>
      <span className="tabular w-10 text-right text-sm font-semibold">{percent} %</span>
    </div>
  );
}
