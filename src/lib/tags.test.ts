import { describe, expect, it } from "vitest";
import { MAX_TAGS, parseTags, tagsProblem, tagsToText } from "@/lib/tags";

describe("parseTags", () => {
  it("splits at commas and tidies each tag", () => {
    expect(parseTags(" trip ,family,  work  trip ")).toEqual(["trip", "family", "work trip"]);
  });

  it("drops empty tags, a leading #, and repeats ignoring case", () => {
    expect(parseTags("trip, #Trip,, ,#, family, FAMILY")).toEqual(["trip", "family"]);
  });

  it("gives nothing for an empty field", () => {
    expect(parseTags("")).toEqual([]);
    expect(parseTags(" , ")).toEqual([]);
  });

  it("keeps any language", () => {
    expect(parseTags("سفر, café")).toEqual(["سفر", "café"]);
  });
});

describe("tagsToText", () => {
  it("is what parseTags reads back", () => {
    expect(tagsToText(["trip", "family"])).toBe("trip, family");
    expect(parseTags(tagsToText(["trip", "family"]))).toEqual(["trip", "family"]);
    expect(tagsToText(undefined)).toBe("");
  });
});

describe("tagsProblem", () => {
  it("accepts tidy tags, and none", () => {
    expect(tagsProblem(["trip", "family"])).toBeNull();
    expect(tagsProblem([])).toBeNull();
  });

  it("refuses too many or too long", () => {
    expect(tagsProblem(Array.from({ length: MAX_TAGS + 1 }, (_, i) => `t${i}`))).toMatch("up to 10 tags");
    expect(tagsProblem(["x".repeat(25)])).toMatch("up to 24 characters");
  });

  it("refuses untidy lists sent without the form", () => {
    for (const tags of [[""], [" trip"], ["trip", "Trip"], ["a,b"], ["#trip"], ["two  spaces"]]) {
      expect(tagsProblem(tags)).toMatch("can't be empty or repeated");
    }
  });
});
