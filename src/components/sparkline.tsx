export function Sparkline({ values, label }: { values: number[]; label: string }) {
  const w = 96, h = 28, min = Math.min(...values) - 2, max = Math.max(...values) + 2;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / (max - min)) * h}`).join(" ");
  const up = values[values.length - 1] >= values[0];
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" className={up ? "stroke-good" : "stroke-bad"} />
    </svg>
  );
}
