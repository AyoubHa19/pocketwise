// Tags: a few free words on a transaction ("trip", "family", "work"), to
// group things across categories without making more categories (PRD 9).
// They're typed in one field, separated by commas.

export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 24;

/** How a description (who was paid, or what it was) is limited. */
export const MAX_DESCRIPTION_LENGTH = 60;

/**
 * The tags in what the user typed: split at commas, each trimmed, with a
 * leading # dropped (people type #trip from habit) and inner spaces
 * squeezed, without empty ones or repeats (ignoring case; the first
 * spelling wins). "trip, #Trip,, family" gives ["trip", "family"].
 */
export function parseTags(text: string): string[] {
  const tags: string[] = [];
  for (const part of text.split(",")) {
    const tag = part.trim().replace(/^#+/, "").trim().replace(/\s+/g, " ");
    if (tag === "") continue;
    if (tags.some((t) => t.toLocaleLowerCase("en") === tag.toLocaleLowerCase("en"))) continue;
    tags.push(tag);
  }
  return tags;
}

/** Tags back into the text field's form: "trip, family". */
export function tagsToText(tags: readonly string[] | undefined): string {
  return (tags ?? []).join(", ");
}

/**
 * What's wrong with these tags, or null if nothing is. They must be as
 * parseTags gives them (so a list sent straight to the server can't hold
 * empty, repeated or untidy tags), at most MAX_TAGS, each at most
 * MAX_TAG_LENGTH characters. Used by the form and, again, by the server.
 */
export function tagsProblem(tags: readonly string[]): string | null {
  if (tags.length > MAX_TAGS) return `A transaction can have up to ${MAX_TAGS} tags.`;
  const long = tags.find((t) => t.length > MAX_TAG_LENGTH);
  if (long) return `A tag can be up to ${MAX_TAG_LENGTH} characters: "${long}" is longer.`;
  const tidy = parseTags(tags.join(","));
  if (tidy.length !== tags.length || tidy.some((t, i) => t !== tags[i])) {
    return "Tags can't be empty or repeated, or contain commas.";
  }
  return null;
}
