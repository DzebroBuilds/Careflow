// Original decorative scene: misty Pacific Northwest ridgelines, evergreens, and one
// lit house. Inline SVG so it needs no asset path (works under the Pages base path)
// and stays within the CSP (no external images).
const TREES = [
  [40, 640, 1.15], [110, 650, 0.8], [175, 645, 1], [250, 655, 0.7], [330, 648, 1.25],
  [880, 650, 1.1], [945, 646, 0.8], [1210, 652, 1.15], [1285, 647, 0.8], [1360, 653, 1.3],
] as const;

function Tree({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-3" y="-8" width="6" height="14" fill="#10281f" />
      <path d="M0 -118 L26 -62 H11 L34 -22 H14 L40 14 H-40 L-14 -22 H-34 L-11 -62 H-26 Z" fill="#12301f" />
    </g>
  );
}

export default function LoginBackdrop() {
  return (
    <svg
      className="login-backdrop"
      viewBox="0 0 1440 800"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="lb-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dfeadf" />
          <stop offset="0.55" stopColor="#f1ead6" />
          <stop offset="1" stopColor="#f7f3e4" />
        </linearGradient>
        <radialGradient id="lb-sun" cx="0.72" cy="0.3" r="0.35">
          <stop offset="0" stopColor="#fff6d8" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fff6d8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lb-mist" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f1e2" stopOpacity="0" />
          <stop offset="1" stopColor="#f4f1e2" stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id="lb-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffd98a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffd98a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1440" height="800" fill="url(#lb-sky)" />
      <rect width="1440" height="800" fill="url(#lb-sun)" />

      {/* far ridge */}
      <path d="M0 470 C120 420 230 440 340 410 C470 372 560 430 690 404 C830 376 930 330 1060 372 C1190 414 1310 380 1440 420 V800 H0 Z" fill="#b9cdbb" />
      {/* mid ridge */}
      <path d="M0 540 C110 500 210 522 330 490 C450 458 540 506 670 492 C800 478 900 438 1030 468 C1170 500 1290 470 1440 506 V800 H0 Z" fill="#8fae98" />
      <rect y="420" width="1440" height="200" fill="url(#lb-mist)" />
      {/* near ridge */}
      <path d="M0 610 C140 574 250 596 380 570 C510 544 610 590 740 580 C880 568 990 536 1120 556 C1250 576 1340 560 1440 584 V800 H0 Z" fill="#5f8a74" />
      {/* foreground meadow */}
      <path d="M0 668 C180 640 330 664 520 650 C720 636 900 660 1100 646 C1260 636 1360 650 1440 644 V800 H0 Z" fill="#2f5c47" />

      {/* house */}
      <g transform="translate(1000 560)">
        <ellipse cx="46" cy="38" rx="120" ry="40" fill="url(#lb-glow)" />
        <rect x="0" y="0" width="92" height="58" rx="3" fill="#e9dfc7" />
        <path d="M-8 2 L46 -38 L100 2 Z" fill="#7a4a3a" />
        <rect x="64" y="-36" width="9" height="20" fill="#7a4a3a" />
        <rect x="12" y="14" width="20" height="22" rx="2" fill="#ffd27a" />
        <rect x="60" y="14" width="20" height="22" rx="2" fill="#ffd27a" />
        <rect x="38" y="26" width="16" height="32" rx="2" fill="#4c3a2f" />
        <path d="M22 14 V36 M12 25 H32 M70 14 V36 M60 25 H80" stroke="#c99a4a" strokeWidth="1.5" />
      </g>

      {TREES.map(([x, y, s]) => (
        <Tree key={`${x}-${y}`} x={x} y={y} s={s} />
      ))}
    </svg>
  );
}
