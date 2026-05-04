/**
 * Utility functions for server-side operations
 */

/**
 * Extracts a numeric sort key from a location string.
 * Returns null if no numeric value can be found.
 *
 * Handles formats:
 *   "p. 23"         → 23
 *   "Ch. 4, p. 89"  → 89      (page takes precedence over chapter)
 *   "page 102"      → 102
 *   "§ 3.2"         → 3       (integer part only)
 *   "1:23:45"       → 5025    (converted to seconds for video/podcast)
 *   "Ch. 4"         → 4       (chapter number as fallback)
 */
export function extractLocationOrder(location: string | null | undefined): number | null {
  if (!location) return null;

  // Priority 1: explicit page reference
  const pageMatch = location.match(/(?:p\.?|page)\s*(\d+)/i);
  if (pageMatch) return parseInt(pageMatch[1], 10);

  // Priority 2: timestamp (h:mm:ss or m:ss)
  const timeMatch = location.match(/(\d+):(\d{2}):(\d{2})/);
  if (timeMatch) {
    return parseInt(timeMatch[1]) * 3600
         + parseInt(timeMatch[2]) * 60
         + parseInt(timeMatch[3]);
  }
  const shortTimeMatch = location.match(/(\d+):(\d{2})/);
  if (shortTimeMatch) {
    return parseInt(shortTimeMatch[1]) * 60 + parseInt(shortTimeMatch[2]);
  }

  // Priority 3: section / chapter / paragraph number
  const sectionMatch = location.match(/(?:ch(?:apter)?\.?|§|sec(?:tion)?\.?)\s*(\d+)/i);
  if (sectionMatch) return parseInt(sectionMatch[1], 10);

  // Priority 4: any leading number
  const numMatch = location.match(/^(\d+)/);
  if (numMatch) return parseInt(numMatch[1], 10);

  return null;
}

/**
 * Generate a visually distinct random hex color for a new idea
 */
export function generateUniqueColor(): string {
  // Use a wide spread of hues with consistent saturation/lightness for readability
  const hue = Math.floor(Math.random() * 360);
  const saturation = 55 + Math.floor(Math.random() * 25); // 55-80%
  const lightness = 52 + Math.floor(Math.random() * 16);  // 52-68%
  // HSL to hex
  const s = saturation / 100;
  const l = lightness / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + hue / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
