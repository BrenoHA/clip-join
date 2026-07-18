import os from "node:os";
import path from "node:path";
import type { Transition } from "./core/types.js";

export const DEFAULT_EXTS = ["mp4", "mov", "m4v", "avi", "mkv"];

/**
 * Overlap length for a transition, in seconds. ffmpeg's own xfade default is
 * 1.0s; we go shorter for a subtler blend. Auto-clamped down when a clip is
 * shorter than this (see core/join.ts).
 */
export const TRANSITION_DURATION_SEC = 0.5;

/** The transitions offered in the UI, in cycle order, with their xfade names. */
export const TRANSITIONS: { id: Transition; label: string; xfade?: string }[] = [
  { id: "none", label: "None" },
  { id: "crossfade", label: "Crossfade", xfade: "fade" },
];

/**
 * Default home for joined videos: a fixed, always-writable folder under the
 * user's home so `clipjoin` behaves identically from any directory (rather than
 * scattering `output/` folders wherever it happens to be launched).
 *   macOS → ~/Movies/ClipJoin   ·   Linux/Windows → ~/Videos/ClipJoin
 */
export function defaultOutputDir(): string {
  const parent = process.platform === "darwin" ? "Movies" : "Videos";
  return path.join(os.homedir(), parent, "ClipJoin");
}

// The active output directory. Defaults per-platform; overridden at startup by
// the `--out <dir>` flag via setOutputDir().
let outputDir = defaultOutputDir();

/** Absolute directory every joined video (and its chapters file) is written to. */
export function getOutputDir(): string {
  return outputDir;
}

/** Point output at a specific directory (from `--out`). Resolved to absolute. */
export function setOutputDir(dir: string): void {
  outputDir = path.resolve(dir);
}

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
