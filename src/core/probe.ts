import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Clip } from "./types.js";

const execFileAsync = promisify(execFile);

// windowsHide stops a console window from flashing up (and stealing terminal
// focus) on every ffprobe spawn — on Windows that makes the UI look frozen.
const EXEC_OPTS = { windowsHide: true } as const;

async function toolExists(tool: string): Promise<boolean> {
  try {
    await execFileAsync(tool, ["-version"], EXEC_OPTS);
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
    ], EXEC_OPTS);
    return JSON.parse(stdout);
  } catch {
    return {};
  }
}

function creationTimeFrom(probe: any, fallback: Date): Date {
  const ct = probe?.format?.tags?.creation_time;
  if (typeof ct === "string") {
    const parsed = new Date(ct);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

function getDuration(probe: any): number {
  const d = parseFloat(probe?.format?.duration);
  return Number.isFinite(d) ? d : 0;
}

function videoStream(probe: any): any {
  return (probe?.streams ?? []).find((s: any) => s.codec_type === "video");
}

function videoSignature(probe: any): string {
  const v = videoStream(probe);
  if (!v) return "unknown";
  return `${v.codec_name ?? "?"} ${v.width ?? "?"}x${v.height ?? "?"}`;
}

/** Parse ffprobe's "num/den" (or plain number) r_frame_rate into fps. */
function parseFps(raw: unknown): number {
  if (typeof raw !== "string") return 0;
  const [num, den] = raw.split("/");
  const n = Number(num);
  const d = den === undefined ? 1 : Number(den);
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return 0;
  return n / d;
}

function hasAudioStream(probe: any): boolean {
  return (probe?.streams ?? []).some((s: any) => s.codec_type === "audio");
}

/** How many ffprobe processes to run at once — bounded so we don't fork-bomb. */
const PROBE_CONCURRENCY = 4;

async function probeOne(file: string): Promise<Clip> {
  const abs = path.resolve(file);
  // A single locked/inaccessible file must not sink the whole probe (which
  // would leave the UI stuck on the spinner, never reaching Arrange).
  const [probe, stat] = await Promise.all([
    ffprobeJson(abs),
    fs.stat(abs).catch(() => null),
  ]);
  const v = videoStream(probe);
  const mtime = stat?.mtime ?? new Date(0);
  return {
    id: abs,
    path: abs,
    name: path.basename(abs),
    durationSec: getDuration(probe),
    sizeBytes: stat?.size ?? 0,
    creationTime: creationTimeFrom(probe, mtime),
    mtime,
    videoSignature: videoSignature(probe),
    width: Number(v?.width) || 0,
    height: Number(v?.height) || 0,
    fps: parseFps(v?.r_frame_rate),
    hasAudio: hasAudioStream(probe),
    included: true,
  };
}

export async function probeClips(
  files: string[],
  onProgress?: (done: number, total: number) => void
): Promise<Clip[]> {
  // Probe in parallel with a small pool: sequential spawns are painfully slow
  // on Windows (process creation + AV scans per launch look like a freeze).
  const clips: Clip[] = new Array(files.length);
  let next = 0;
  let done = 0;

  async function worker() {
    while (true) {
      const i = next++;
      if (i >= files.length) return;
      clips[i] = await probeOne(files[i]);
      onProgress?.(++done, files.length);
    }
  }

  const workers = Array.from(
    { length: Math.min(PROBE_CONCURRENCY, files.length) },
    () => worker()
  );
  await Promise.all(workers);
  return clips;
}
