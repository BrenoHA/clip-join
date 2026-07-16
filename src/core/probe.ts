import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Clip } from "./types.js";

const execFileAsync = promisify(execFile);

async function toolExists(tool: string): Promise<boolean> {
  try {
    await execFileAsync(tool, ["-version"]);
    return true;
  } catch {
    return false;
  }
}

export interface DepStatus {
  ffmpeg: boolean;
  ffprobe: boolean;
  ok: boolean;
}

export async function checkDeps(): Promise<DepStatus> {
  const [ffmpeg, ffprobe] = await Promise.all([toolExists("ffmpeg"), toolExists("ffprobe")]);
  return { ffmpeg, ffprobe, ok: ffmpeg && ffprobe };
}

async function ffprobeJson(file: string): Promise<any> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error", "-print_format", "json", "-show_format", "-show_streams", file,
    ]);
    return JSON.parse(stdout);
  } catch {
    return {};
  }
}

async function getCreationTime(file: string, probe: any): Promise<Date> {
  const ct = probe?.format?.tags?.creation_time;
  if (typeof ct === "string") {
    const parsed = new Date(ct);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const stat = await fs.stat(file);
  return stat.mtime;
}

function getDuration(probe: any): number {
  const d = parseFloat(probe?.format?.duration);
  return Number.isFinite(d) ? d : 0;
}

function videoSignature(probe: any): string {
  const v = (probe?.streams ?? []).find((s: any) => s.codec_type === "video");
  if (!v) return "unknown";
  return `${v.codec_name ?? "?"} ${v.width ?? "?"}x${v.height ?? "?"}`;
}

export async function probeClips(
  files: string[],
  onProgress?: (done: number, total: number) => void
): Promise<Clip[]> {
  const clips: Clip[] = [];
  let done = 0;
  for (const file of files) {
    const abs = path.resolve(file);
    const [probe, stat] = await Promise.all([ffprobeJson(abs), fs.stat(abs)]);
    clips.push({
      id: abs,
      path: abs,
      name: path.basename(abs),
      durationSec: getDuration(probe),
      sizeBytes: stat.size,
      creationTime: await getCreationTime(abs, probe),
      videoSignature: videoSignature(probe),
      included: true,
    });
    onProgress?.(++done, files.length);
  }
  return clips;
}
