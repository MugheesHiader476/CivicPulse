/** Brand mark: a rounded tile with a heartbeat line. */
export function PulseLogo({ size = 40 }: { size?: number }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff3d7f" />
          <stop offset="1" stopColor="#ffb400" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="58" height="58" rx="16" fill="url(#logo-grad)" stroke="currentColor" strokeWidth="4" />
      <path
        className="logo-beat"
        d="M10 34h11l5-12 8 22 6-16 4 6h10"
        fill="none"
        stroke="#16132a"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={100}
      />
    </svg>
  );
}

/** A long animated ECG trace, used while the server triages a complaint. */
export function PulseTrace() {
  return (
    <svg className="trace" viewBox="0 0 600 120" preserveAspectRatio="none" aria-hidden="true">
      <path
        className="trace-line"
        d="M0 60 H120 L140 60 L155 20 L175 105 L195 35 L210 60 H330 L350 60 L365 15 L385 110 L405 30 L420 60 H600"
        pathLength={100}
      />
    </svg>
  );
}
