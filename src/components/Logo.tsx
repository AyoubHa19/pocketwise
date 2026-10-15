/**
 * The Pocketwise mark, the same drawing as the app icon (src/app/icon.svg):
 * a wallet with a leaf, money kept calmly and growing. Redrawn as a vector
 * from the logo the user chose, so it stays sharp at any size. Decorative:
 * the link around it carries the name.
 */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 64 64" className="shrink-0">
      <path
        d="M3 13a6 6 0 0 1 6-6h36a6 6 0 0 1 6 6v33.5a3 3 0 0 1-1.1 2.3l-15.8 12.6a3 3 0 0 1-3.8 0L4.1 48.8A3 3 0 0 1 3 46.5z"
        fill="#3b5941"
      />
      <rect x="7" y="9.5" width="38" height="3.6" rx="1.8" fill="#e9f0e9" />
      <path
        d="M8 17.5v28.2l16.6 13 16.6-13"
        fill="none"
        stroke="#c9dccf"
        strokeWidth="1.1"
        strokeDasharray="2.2 1.8"
        strokeLinecap="round"
        opacity="0.8"
      />
      <rect x="42" y="27" width="20" height="16" rx="5" fill="#456349" stroke="#e9f0e9" strokeWidth="1.6" />
      <circle cx="50" cy="35" r="2.8" fill="#e9f0e9" />
      <g transform="translate(17 49) rotate(-56)">
        <path d="M11 0C17-9 38-11 56 0C41 7.5 21 8.5 11 0z" fill="#afc9ac" stroke="#f4f8f3" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M0 0H50" stroke="#3b5941" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M28-6.5l4 3.5M38-6.6l3.4 3.6M24 4.5l4-2.8M34 5.4l4-3.2" stroke="#f4f8f3" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M0 0H12" stroke="#f4f8f3" strokeWidth="3.6" strokeLinecap="round" />
        <path d="M0.5 0H12" stroke="#afc9ac" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    </svg>
  );
}
