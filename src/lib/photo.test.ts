import { describe, expect, it } from "vitest";
import { MAX_PHOTO_BYTES, photoProblem } from "@/lib/photo";

describe("photoProblem", () => {
  it("accepts JPEG, PNG and WebP up to 5 MB", () => {
    expect(photoProblem({ type: "image/jpeg", size: 200_000 })).toBeNull();
    expect(photoProblem({ type: "image/png", size: MAX_PHOTO_BYTES })).toBeNull();
    expect(photoProblem({ type: "image/webp", size: 1 })).toBeNull();
  });

  it("refuses other files and photos that are too big", () => {
    expect(photoProblem({ type: "image/gif", size: 1000 })).toMatch("JPEG, PNG or WebP");
    expect(photoProblem({ type: "application/pdf", size: 1000 })).toMatch("JPEG, PNG or WebP");
    expect(photoProblem({ type: "image/jpeg", size: MAX_PHOTO_BYTES + 1 })).toMatch("over 5 MB");
  });
});
