export interface Clip {
  id: string;
  path: string;
  name: string;
  durationSec: number;
  sizeBytes: number;
  creationTime: Date;
  /** File modified time (from the filesystem), shown on the arrange screen. */
  mtime: Date;
  /** codec + WxH of the first video stream; used to guess lossless-ability. */
  videoSignature: string;
  /** Pixel dimensions of the first video stream (0 if unknown). */
  width: number;
  height: number;
  /** Frames per second of the first video stream (0 if unknown). */
  fps: number;
  /** Whether the file has at least one audio stream. */
  hasAudio: boolean;
  included: boolean;
}

export type JoinMode = "lossless" | "reencode";

/** Optional blend applied between clips. "none" keeps the current butt-join. */
export type Transition = "none" | "crossfade";

export interface JoinResult {
  mode: JoinMode;
  outputPath: string;
  sizeBytes: number;
  durationSec: number;
  elapsedMs: number;
  chaptersPath?: string;
}

export interface JoinProgress {
  fraction: number;
  mode: JoinMode;
}
