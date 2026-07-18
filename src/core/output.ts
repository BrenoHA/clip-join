import { promises as fs } from "node:fs";
import path from "node:path";
import { OUTPUT_DIR, defaultOutputName } from "../config.js";
import { humanClock } from "./format.js";
import type { Clip } from "./types.js";

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

/** Build the line-per-chapter text content for the given (included) clips. */
function buildChaptersContent(clips: Clip[]): string {
  let cumulative = 0;
  const lines: string[] = [];
  for (const clip of clips) {
    const name = path.parse(clip.name).name;
    lines.push(`${humanClock(cumulative)} ${name}`);
    cumulative += clip.durationSec;
  }
  return lines.join("\n") + "\n";
}

/**
 * Write a chapters .txt file alongside the video output.
 * Returns the generated file path, or an empty string when there are no clips.
 */
export async function writeChaptersFile(
  clips: Clip[],
  videoOutputPath: string
): Promise<string> {
  if (clips.length === 0) return "";
  const parsed = path.parse(videoOutputPath);
  const chaptersPath = path.join(parsed.dir, `${parsed.name}_chapters.txt`);
  const content = buildChaptersContent(clips);
  await fs.writeFile(chaptersPath, content, "utf-8");
  return chaptersPath;
}
