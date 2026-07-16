import path from "node:path";

export const DEFAULT_EXTS = ["mp4", "mov", "m4v", "avi", "mkv"];

/** Every joined video is written here, relative to where ClipJoin is launched. */
export const OUTPUT_DIR = path.resolve(process.cwd(), "output");

export const REENCODE_CRF = 18;
export const REENCODE_PRESET = "veryfast";

/**
 * Timestamped default filename, so repeated joins never silently overwrite each
 * other when the user leaves the name unchanged.
 */
export function defaultOutputName(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  return `joined_output_${stamp}.mp4`;
}
