/**
 * The Pocketwise mark, the same drawing as the app icon (src/app/icon.svg):
 * a coin dropping into a pocket. Decorative: the link around it carries
 * the name.
 */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 32 32" className="shrink-0">
      <rect width="32" height="32" rx="9" fill="#3f5f4b" />
      <circle cx="16" cy="11.5" r="5" fill="#c9dccf" />
      <path d="M7 15h18v4a9 9 0 0 1-18 0z" fill="#ffffff" />
    </svg>
  );
}
