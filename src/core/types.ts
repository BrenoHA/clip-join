export interface Clip {
  id: string;
  path: string;
  name: string;
  durationSec: number;
  sizeBytes: number;
  creationTime: Date;
  /** codec + WxH of the first video stream; used to guess lossless-ability. */
  videoSignature: string;
  included: boolean;
}

export type JoinMode = "lossless" | "reencode";

export interface JoinResult {
  mode: JoinMode;
  outputPath: string;
  sizeBytes: number;
  durationSec: number;
  elapsedMs: number;
}

export interface JoinProgress {
  fraction: number;
  mode: JoinMode;
}
