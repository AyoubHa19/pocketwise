/**
 * The Pocketwise logo: a wallet with a leaf, the user's own logo cut out of
 * the picture they chose (public/logo-mark.png, 255 × 276), so it's exactly
 * theirs. The same picture makes the tab icon (src/app/icon.png) and the
 * iPhone icon. Decorative: the link around it carries the name.
 */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a small fixed image from public/, shown at its own proportions.
    <img src="/logo-mark.png" width={Math.round((size * 255) / 276)} height={size} alt="" className="shrink-0" />
  );
}
