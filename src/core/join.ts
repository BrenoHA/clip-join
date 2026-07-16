import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { REENCODE_CRF, REENCODE_PRESET } from "../config.js";
import { ensureOutputDir } from "./output.js";
import type { Clip, JoinMode, JoinProgress, JoinResult } from "./types.js";

async function buildConcatFile(paths: string[]): Promise<string> {
  const tmp = path.join(os.tmpdir(), `clipjoin-${Date.now()}-${process.pid}.txt`);
  const body = paths
    .map((p) => `file '${path.resolve(p).replace(/'/g, "'\\''")}'`)
    .join("\n");
  await fs.writeFile(tmp, body + "\n", "utf8");
  return tmp;
}

function runFfmpeg(
  args: string[],
  totalDuration: number,
  mode: JoinMode,
  onProgress?: (p: JoinProgress) => void
): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn("ffmpeg", [...args, "-progress", "pipe:1", "-nostats"]);
    let stderr = "";
    let stdoutBuf = "";

    proc.stdout.on("data", (chunk: Buffer) => {
      stdoutBuf += chunk.toString();
      let idx: number;
      while ((idx = stdoutBuf.indexOf("\n")) !== -1) {
        const line = stdoutBuf.slice(0, idx).trim();
        stdoutBuf = stdoutBuf.slice(idx + 1);
        // out_time_us (newer) / out_time_ms (older) are both microseconds.
        const m = line.match(/^out_time_(?:us|ms)=(\d+)/);
        if (m && totalDuration > 0) {
          const fraction = Math.min(1, Math.max(0, Number(m[1]) / 1_000_000 / totalDuration));
          onProgress?.({ fraction, mode });
        }
      }
    });

    proc.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
    proc.on("error", () => resolve({ code: 1, stderr: stderr || "failed to spawn ffmpeg" }));
    proc.on("close", (code) => resolve({ code: code ?? 1, stderr }));
  });
}

export interface RunJoinOptions {
  clips: Clip[];
  /** Absolute path; resolve via core/output.resolveOutputPath first. */
  output: string;
  forceReencode?: boolean;
  crf?: number;
  preset?: string;
  onProgress?: (p: JoinProgress) => void;
}

/** Join the included clips, trying a lossless stream copy before re-encoding. */
export async function runJoin(opts: RunJoinOptions): Promise<JoinResult> {
  const {
    output,
    forceReencode = false,
    crf = REENCODE_CRF,
    preset = REENCODE_PRESET,
    onProgress,
  } = opts;
  const included = opts.clips.filter((c) => c.included);
  if (included.length === 0) throw new Error("No clips selected to join.");

  await ensureOutputDir();

  const totalDuration = included.reduce((sum, c) => sum + c.durationSec, 0);
  const concatFile = await buildConcatFile(included.map((c) => c.path));
  const started = Date.now();

  try {
    if (!forceReencode) {
      const args = ["-y", "-f", "concat", "-safe", "0", "-i", concatFile, "-c", "copy", output];
      onProgress?.({ fraction: 0, mode: "lossless" });
      const { code } = await runFfmpeg(args, totalDuration, "lossless", onProgress);
      if (code === 0) return finalize(output, "lossless", totalDuration, started);
    }

    const args = [
      "-y", "-f", "concat", "-safe", "0", "-i", concatFile,
      "-c:v", "libx264", "-crf", String(crf), "-preset", preset,
      "-c:a", "aac", "-b:a", "192k", output,
    ];
    onProgress?.({ fraction: 0, mode: "reencode" });
    const { code, stderr } = await runFfmpeg(args, totalDuration, "reencode", onProgress);
    if (code !== 0) throw new Error(`ffmpeg failed:\n${stderr.split("\n").slice(-15).join("\n")}`);
    return finalize(output, "reencode", totalDuration, started);
  } finally {
    await fs.rm(concatFile, { force: true });
  }
}

async function finalize(
  output: string,
  mode: JoinMode,
  durationSec: number,
  started: number
): Promise<JoinResult> {
  const stat = await fs.stat(output).catch(() => null);
  return {
    mode,
    outputPath: path.resolve(output),
    sizeBytes: stat?.size ?? 0,
    durationSec,
    elapsedMs: Date.now() - started,
  };
}
