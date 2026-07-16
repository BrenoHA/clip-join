import { promises as fs } from "node:fs";
import path from "node:path";
import { DEFAULT_EXTS } from "../config.js";
import type { Clip } from "./types.js";

export async function findVideos(
  folder: string,
  exts: string[] = DEFAULT_EXTS,
  recursive = false
): Promise<string[]> {
  const wanted = new Set(exts.map((e) => e.toLowerCase().replace(/^\./, "")));
  const matches: string[] = [];

  async function walk(dir: string, descend: boolean) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (descend) await walk(full, true);
      } else if (entry.isFile()) {
        const ext = entry.name.split(".").pop()?.toLowerCase() ?? "";
        if (wanted.has(ext)) matches.push(full);
      }
    }
  }

  await walk(folder, recursive);
  return matches;
}

export function sortClips(clips: Clip[], by: "date" | "name"): Clip[] {
  const copy = [...clips];
  if (by === "date") {
    copy.sort((a, b) => a.creationTime.getTime() - b.creationTime.getTime());
  } else {
    copy.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  }
  return copy;
}

/** True when every included clip shares one signature, so a stream copy can work. */
export function canLossless(clips: Clip[]): boolean {
  const included = clips.filter((c) => c.included);
  if (included.length === 0) return false;
  const first = included[0].videoSignature;
  return included.every((c) => c.videoSignature === first);
}
