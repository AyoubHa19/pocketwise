/**
 * A font size that keeps `text` on one line in its box. Measured in Geist,
 * amounts need at most about 0.6em per character, so the font can be at
 * most the box's width (100cqi, from the nearest @container) divided by
 * that. `clamp` keeps it between a readable `min` and the normal `max`.
 */
export function fitOneLine(text: string, min: string, max: string) {
  const ems = (text.length * 0.6).toFixed(2);
  return { fontSize: `clamp(${min}, calc(100cqi / ${ems}), ${max})` };
}
