import { appendFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Opt-in file logger for diagnosing issues that happen inside the fullscreen
 * alt-buffer UI, where stdout/stderr aren't visible to the user. Enabled with
 * CLIPJOIN_DEBUG=1. Writes are synchronous — this is a debug tool, not a hot
 * path, and sync writes guarantee the last line lands even if the process
 * later hangs or is killed.
 */
export const DEBUG_ENABLED = process.env.CLIPJOIN_DEBUG === "1";

export const LOG_PATH = path.join(os.tmpdir(), "clip-join-debug.log");

const start = process.hrtime.bigint();

function elapsedMs(): string {
  return (Number(process.hrtime.bigint() - start) / 1_000_000).toFixed(1);
}

export function debugLog(msg: string): void {
  if (!DEBUG_ENABLED) return;
  try {
    appendFileSync(LOG_PATH, `[+${elapsedMs()}ms] ${msg}\n`);
  } catch {
    // Never let logging itself crash the app.
  }
}

/**
 * Wraps process.stdout.write so we can see how long each screen redraw takes.
 * On Windows, writes to a console (not redirected to a file) are SYNCHRONOUS,
 * so a slow console (legacy conhost, QuickEdit/selection paused, huge
 * scrollback) can block the whole event loop on every keypress-triggered
 * repaint — which looks exactly like a freeze that later "catches up".
 */
export function installStdoutProfiler(thresholdMs = 30): void {
  if (!DEBUG_ENABLED) return;
  const stdout = process.stdout;
  const originalWrite = stdout.write.bind(stdout);
  (stdout as any).write = (chunk: any, ...rest: any[]) => {
    const t0 = process.hrtime.bigint();
    const result = originalWrite(chunk, ...rest);
    const ms = Number(process.hrtime.bigint() - t0) / 1_000_000;
    if (ms >= thresholdMs) {
      const size = typeof chunk === "string" ? chunk.length : chunk?.length ?? 0;
      debugLog(`SLOW stdout.write took ${ms.toFixed(1)}ms for ${size} bytes`);
    }
    return result;
  };
}

export function logEnvironment(): void {
  if (!DEBUG_ENABLED) return;
  debugLog(
    `env platform=${process.platform} node=${process.version} isTTY=${process.stdout.isTTY} ` +
      `cols=${process.stdout.columns} rows=${process.stdout.rows} ` +
      `TERM=${process.env.TERM ?? ""} TERM_PROGRAM=${process.env.TERM_PROGRAM ?? ""} ` +
      `WT_SESSION=${process.env.WT_SESSION ?? ""} ConEmuPID=${process.env.ConEmuPID ?? ""} ` +
      `CI=${process.env.CI ?? ""}`
  );
}

export function installGlobalErrorLogging(): void {
  if (!DEBUG_ENABLED) return;
  process.on("uncaughtException", (err) => {
    debugLog(`UNCAUGHT EXCEPTION: ${err?.stack ?? err}`);
  });
  process.on("unhandledRejection", (reason) => {
    debugLog(`UNHANDLED REJECTION: ${(reason as any)?.stack ?? reason}`);
  });
  process.on("SIGINT", () => debugLog("SIGINT received"));
  process.on("exit", (code) => debugLog(`process exit code=${code}`));
}
