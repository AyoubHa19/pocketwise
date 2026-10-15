// The user's own profile photo (uploaded in Settings, kept by Clerk).

/** The photo types and size Pocketwise accepts for a profile photo. */
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** Why a file can't be the profile photo, or null when it can. */
export function photoProblem(file: { type: string; size: number }): string | null {
  if (!PHOTO_TYPES.includes(file.type)) return "Choose a JPEG, PNG or WebP photo.";
  if (file.size > MAX_PHOTO_BYTES) return "That photo is over 5 MB. Choose a smaller one.";
  return null;
}
