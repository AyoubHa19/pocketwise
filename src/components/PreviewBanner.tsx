/**
 * A strip across the top of a preview deployment, which signs people in
 * with Clerk's development instance. That isn't meant for real data, so
 * the strip says so. It shows only when NEXT_PUBLIC_POCKETWISE_PREVIEW is
 * "1" (set on the hosting, read when the app is built): never locally,
 * and not once a production setup with its own domain replaces the preview.
 */
export function PreviewBanner() {
  if (process.env.NEXT_PUBLIC_POCKETWISE_PREVIEW !== "1") return null;
  return (
    <p className="bg-foreground px-4 py-2 text-center text-sm text-canvas">
      Preview: please don&apos;t enter real financial data.
    </p>
  );
}
