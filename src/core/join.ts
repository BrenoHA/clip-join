import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { REENCODE_CRF, REENCODE_PRESET, TRANSITION_DURATION_SEC, TRANSITIONS } from "../config.js";
import { ensureOutputDir } from "./output.js";
import type { Clip, JoinMode, JoinProgress, JoinResult, Transition } from "./types.js";

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
  /** Blend between clips. Anything but "none" forces a re-encode. */
  transition?: Transition;
  onProgress?: (p: JoinProgress) => void;
}

/**
 * Safe overlap length for a transition: the configured default, but never as
 * long as the shortest clip (xfade would run off the end of a short clip).
 */
export function resolveTransitionDuration(clips: Clip[]): number {
  const shortest = Math.min(...clips.map((c) => c.durationSec));
  return Math.max(0.1, Math.min(TRANSITION_DURATION_SEC, shortest - 0.05));
}

/**
 * Build the ffmpeg args for a transition join: every clip is its own `-i`
 * input, blended with an xfade (video) / acrossfade (audio) filtergraph. This
 * always re-encodes. Pure/synchronous so it can be unit-tested without ffmpeg.
 *
 * `d` is the per-boundary overlap in seconds (see resolveTransitionDuration).
 */
export function buildTransitionArgs(
  clips: Clip[],
  output: string,
  transition: Transition,
  d: number,
  enc: { crf: number; preset: string }
): { args: string[]; totalDuration: number } {
  const n = clips.length;
  const xfade = TRANSITIONS.find((t) => t.id === transition)?.xfade ?? "fade";
  const withAudio = clips.every((c) => c.hasAudio);

  // Normalize to the first clip's geometry/framerate so every xfade pair matches.
  const w = clips[0].width || 1920;
  const h = clips[0].height || 1080;
  const fps = clips[0].fps || 30;

  const parts: string[] = [];

  // Video: normalize each input, then chain xfade across the boundaries.
  for (let i = 0; i < n; i++) {
    parts.push(
      `[${i}:v]fps=${fps},scale=${w}:${h}:force_original_aspect_ratio=decrease,` +
        `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p,settb=AVTB[v${i}]`
    );
  }
  let vPrev = "v0";
  let sumBefore = clips[0].durationSec;
  for (let k = 1; k < n; k++) {
    const out = k === n - 1 ? "vout" : `vx${k}`;
    const offset = sumBefore - k * d;
    parts.push(
      `[${vPrev}][v${k}]xfade=transition=${xfade}:duration=${d}:offset=${offset.toFixed(3)}[${out}]`
    );
    vPrev = out;
    sumBefore += clips[k].durationSec;
  }

  // Audio: crossfade the tail of each clip into the next (skipped if any clip
  // has no audio track — acrossfade would fail).
  if (withAudio) {
    for (let i = 0; i < n; i++) {
      parts.push(`[${i}:a]aresample=async=1,aformat=sample_fmts=fltp:channel_layouts=stereo[a${i}]`);
    }
    let aPrev = "a0";
    for (let k = 1; k < n; k++) {
      const out = k === n - 1 ? "aout" : `ax${k}`;
      parts.push(`[${aPrev}][a${k}]acrossfade=d=${d}[${out}]`);
      aPrev = out;
    }
  }

  const args = ["-y"];
  for (const c of clips) args.push("-i", c.path);
  args.push("-filter_complex", parts.join(";"));
  args.push("-map", "[vout]");
  if (withAudio) args.push("-map", "[aout]");
  // Force 4:2:0 on the encoder: xfade's output format is flexible, so without
  // this ffmpeg may up-convert to yuv444p, which QuickTime refuses to play.
  args.push("-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", String(enc.crf), "-preset", enc.preset);
  if (withAudio) args.push("-c:a", "aac", "-b:a", "192k");
  args.push(output);

  const totalDuration = clips.reduce((sum, c) => sum + c.durationSec, 0) - (n - 1) * d;
  return { args, totalDuration };
}

/** Join the included clips, trying a lossless stream copy before re-encoding. */
export async function runJoin(opts: RunJoinOptions): Promise<JoinResult> {
  const {
    output,
    forceReencode = false,
    crf = REENCODE_CRF,
    preset = REENCODE_PRESET,
    transition = "none",
    onProgress,
  } = opts;
  const included = opts.clips.filter((c) => c.included);
  if (included.length === 0) throw new Error("No clips selected to join.");

  await ensureOutputDir();
  const started = Date.now();

  // Transition path: filtergraph, always re-encodes. Needs at least two clips
  // (a single clip has no boundary to blend), so fall through to concat otherwise.
  if (transition !== "none" && included.length >= 2) {
    const d = resolveTransitionDuration(included);
    const { args, totalDuration } = buildTransitionArgs(included, output, transition, d, {
      crf,
      preset,
    });
    onProgress?.({ fraction: 0, mode: "reencode" });
    const { code, stderr } = await runFfmpeg(args, totalDuration, "reencode", onProgress);
    if (code !== 0) throw new Error(`ffmpeg failed:\n${stderr.split("\n").slice(-15).join("\n")}`);
    return finalize(output, "reencode", totalDuration, started);
  }

  const totalDuration = included.reduce((sum, c) => sum + c.durationSec, 0);
  const concatFile = await buildConcatFile(included.map((c) => c.path));

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
