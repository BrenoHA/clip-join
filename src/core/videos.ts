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

// Codecs safe to stream-copy straight into an .mp4. H.264 plays everywhere.
// HEVC/H.265 (the default on most modern phones) is safe to copy on platforms
// with a system decoder (macOS, Linux) — the copy is instant and the result
// plays fine there. It is NOT safe on stock Windows, which has no HEVC decoder
// and refuses to open the copied file ("Missing codec", 0xc00d5212); there it
// must be re-encoded to H.264 instead. So HEVC's copyability is host-dependent
// (see canLossless), while H.264 is always allowed.
const SAFE_COPY_CODECS = new Set(["h264"]);

/** True when every included clip shares one signature that's also safe to stream-copy. */
export function canLossless(clips: Clip[]): boolean {
  const included = clips.filter((c) => c.included);
  if (included.length === 0) return false;
  const first = included[0].videoSignature;
  if (!included.every((c) => c.videoSignature === first)) return false;
  const codec = first.split(/[ _]/)[0]?.toLowerCase();
  if (!codec) return false;
  // HEVC copies fine anywhere with a system decoder, but stock Windows has none,
  // so force a re-encode there and allow the fast copy on macOS/Linux.
  if (codec === "hevc" || codec === "h265") return process.platform !== "win32";
  return SAFE_COPY_CODECS.has(codec);
}
