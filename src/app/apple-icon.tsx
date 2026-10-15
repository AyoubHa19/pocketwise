import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// iPhones need a square PNG for the home screen icon, so this draws the
// logo (public/logo-mark.png, the user's own logo cut out of its picture)
// on a square when the app is built. Change the logo there, not here.

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// The logo's own proportions (255 × 276), fitted inside the square with a
// little room around it.
const MARK_HEIGHT = 152;
const MARK_WIDTH = Math.round((MARK_HEIGHT * 255) / 276);

export default async function AppleIcon() {
  const png = await readFile(join(process.cwd(), "public/logo-mark.png"));
  const pngUrl = `data:image/png;base64,${png.toString("base64")}`;

  return new ImageResponse(
    (
      // iOS rounds the corners itself and shows transparent parts as black,
      // so the whole square gets the app's off-white behind the logo.
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4f6f1",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse needs a plain <img>, not next/image. */}
        <img src={pngUrl} width={MARK_WIDTH} height={MARK_HEIGHT} alt="" />
      </div>
    ),
    size,
  );
}
