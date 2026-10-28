import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { REENCODE_CRF, REENCODE_PRESET, TRANSITION_DURATION_SEC, TRANSITIONS, IMAGE_FPS } from "../config.js";
import { ensureOutputDir } from "./output.js";
import { canLossless } from "./videos.js";
import type { Clip, JoinMode, JoinProgress, JoinResult, Transition } from "./types.js";

/**
 * ffmpeg's concat demuxer treats backslash as an escape character, so a raw
 * Windows path (`C:\Users\me\clip.mp4`) gets mangled. Forward slashes work on
 * every platform (Windows ffmpeg accepts them too), so normalize on Windows.
 * Pure and platform-parameterized so it can be unit-tested off-Windows.
 */
export function normalizeConcatPath(
  p: string,
  isWindows = process.platform === "win32"
): string {
  return isWindows ? p.replace(/\\/g, "/") : p;
}

async function buildConcatFile(paths: string[]): Promise<string> {
  const tmp = path.join(os.tmpdir(), `clipjoin-${Date.now()}-${process.pid}.txt`);
  const body = paths
    .map((p) => `file '${normalizeConcatPath(path.resolve(p)).replace(/'/g, "'\\''")}'`)
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
    const proc = spawn("ffmpeg", [...args, "-progress", "pipe:1", "-nostats"], {
      windowsHide: true, // don't flash a console window / steal focus on Windows
    });
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
 * Build the ffmpeg args for a join that runs through one filter_complex
 * graph. Used both for the transition join (chained xfade/acrossfade) and —
 * whenever any still image is part of the selection — for the plain
 * butt-join, because the concat demuxer can't hold images.
 *
 * An image is fed as a `-loop 1 -t <duration>` input, so it becomes a
 * fixed-length video stream; from there it's just another segment, which is
 * why crossfades between photos and videos work unchanged.
 *
 * Audio: concat/acrossfade need one audio stream per segment, so segments
 * without a real audio track (stills, audio-less videos) get synthesized
 * silence via anullsrc. When no included clip has real audio, the output
 * audio track is dropped entirely — a photo slideshow shouldn't carry a
 * fake AAC track.
 *
 * Pure/synchronous so it can be unit-tested without ffmpeg.
 * `d` is the per-boundary overlap in seconds (0 for a butt-join concat).
 */
export function buildFiltergraphJoinArgs(
  clips: Clip[],
  output: string,
  transition: Transition,
  d: number,
  enc: { crf: number; preset: string }
): { args: string[]; totalDuration: number } {
  const n = clips.length;
  const chained = transition !== "none" && n >= 2;
  const xfade = TRANSITIONS.find((t) => t.id === transition)?.xfade ?? "fade";
  const withAudio = clips.some((c) => c.kind === "video" && c.hasAudio);

  // Normalize to the first clip's geometry/framerate so every segment matches
  // — both the concat filter and xfade refuse mismatched stream parameters.
  const w = clips[0].width || 1920;
  const h = clips[0].height || 1080;
  const fps = clips[0].fps || 30;

  const parts: string[] = [];
  const args: string[] = ["-y"];

  // Inputs: videos as-is; stills looped into fixed-length streams. Every input
  // is then normalized to one geometry/framerate for the segment chain.
  for (let i = 0; i < n; i++) {
    const clip = clips[i];
    if (clip.kind === "image") {
      args.push(
        "-loop", "1",
        "-framerate", String(IMAGE_FPS),
        "-t", clip.durationSec.toFixed(3),
        "-i", clip.path
      );
    } else {
      args.push("-i", clip.path);
    }
    parts.push(
      `[${i}:v]fps=${fps},scale=${w}:${h}:force_original_aspect_ratio=decrease,` +
        `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p,settb=AVTB[v${i}]`
    );
  }

  /**
   * Audio chain for segment i: its real audio, or anullsrc silence trimmed to
   * the segment's length. Every segment needs one for concat / acrossfade.
   */
  const audioChain = (i: number): string => {
    const clip = clips[i];
    if (clip.kind === "video" && clip.hasAudio) {
      return `[${i}:a]aresample=async=1,aformat=sample_fmts=fltp:channel_layouts=stereo[a${i}]`;
    }
    return (
      `anullsrc=r=48000:cl=stereo,atrim=duration=${clip.durationSec.toFixed(3)},` +
      `aformat=sample_fmts=fltp:channel_layouts=stereo[a${i}]`
    );
  };

  if (chained) {
    // Video: chain xfade across the boundaries.
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

    if (withAudio) {
      // Audio: crossfade the tail of each segment into the next. Segments
      // filled with synthesized silence participate like any other.
      for (let i = 0; i < n; i++) parts.push(audioChain(i));
      let aPrev = "a0";
      for (let k = 1; k < n; k++) {
        const out = k === n - 1 ? "aout" : `ax${k}`;
        parts.push(`[${aPrev}][a${k}]acrossfade=d=${d}[${out}]`);
        aPrev = out;
      }
    }
  } else {
    // Butt-join: one concat instance over all normalized segments.
    if (withAudio) {
      for (let i = 0; i < n; i++) parts.push(audioChain(i));
      const ins = clips.map((_, i) => `[v${i}][a${i}]`).join("");
      parts.push(`${ins}concat=n=${n}:v=1:a=1[vout][aout]`);
    } else {
      const ins = clips.map((_, i) => `[v${i}]`).join("");
      parts.push(`${ins}concat=n=${n}:v=1:a=0[vout]`);
    }
  }

  args.push("-filter_complex", parts.join(";"));
  args.push("-map", "[vout]");
  if (withAudio) args.push("-map", "[aout]");
  // Force 4:2:0 on the encoder: the graph's output format is flexible, so
  // without this ffmpeg may up-convert to yuv444p, which QuickTime refuses
  // to play.
  args.push("-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", String(enc.crf), "-preset", enc.preset);
  if (withAudio) args.push("-c:a", "aac", "-b:a", "192k");
  args.push(output);

  const sum = clips.reduce((acc, c) => acc + c.durationSec, 0);
  const totalDuration = chained ? sum - (n - 1) * d : sum;
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

  // Any still image forces the filtergraph path — the concat demuxer can't
  // hold images, and stills can never stream-copy anyway. The transition
  // join lives in the same graph (see buildFiltergraphJoinArgs).
  const hasImages = included.some((c) => c.kind === "image");
  const useGraph = hasImages || (transition !== "none" && included.length >= 2);
  if (useGraph) {
    const d =
      transition !== "none" && included.length >= 2
        ? resolveTransitionDuration(included)
        : 0;
    const { args, totalDuration } = buildFiltergraphJoinArgs(included, output, transition, d, {
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
    if (!forceReencode && canLossless(included)) {
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
