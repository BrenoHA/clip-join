import { promises as fs } from "node:fs";
import path from "node:path";
import { OUTPUT_DIR, defaultOutputName } from "../config.js";

/**
 * Resolve a user-supplied name to an absolute path inside OUTPUT_DIR. Only the
 * basename is honored, so "../evil.mp4" or an absolute path can't escape output/.
 */
export function resolveOutputPath(name: string): string {
  let base = path.basename(name.trim());
  // basename() strips separators; "." / ".." would still resolve to or above
  // OUTPUT_DIR, so fall back to the default for those (and for an empty name).
  if (!base || base === "." || base === "..") base = defaultOutputName();
  return path.join(OUTPUT_DIR, base);
}

export async function ensureOutputDir(): Promise<void> {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}
