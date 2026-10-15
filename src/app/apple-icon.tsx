import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// iPhones need a PNG for the home screen icon, so this turns icon.svg into
// one when the app is built. Change the drawing in icon.svg, not here.

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const svg = await readFile(join(process.cwd(), "src/app/icon.svg"));
  const svgUrl = `data:image/svg+xml;base64,${svg.toString("base64")}`;

  return new ImageResponse(
    (
      // iOS rounds the corners itself, so fill the whole square with the
      // background green, or the drawing's own rounded corners show as black.
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#3f5f4b",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse needs a plain <img>, not next/image. */}
        <img src={svgUrl} width={size.width} height={size.height} alt="" />
      </div>
    ),
    size,
  );
}
