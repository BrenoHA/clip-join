#!/usr/bin/env node
import React from "react";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "ink";
import { App } from "./ui/App.js";
import { setOutputDir } from "./config.js";
import {
  DEBUG_ENABLED,
  LOG_PATH,
  debugLog,
  installGlobalErrorLogging,
  installStdoutProfiler,
  logEnvironment,
} from "./debug.js";

installGlobalErrorLogging();
installStdoutProfiler();
logEnvironment();
if (DEBUG_ENABLED) {
  console.error(`[clip-join debug] logging to ${LOG_PATH}`);
}

const argv = process.argv.slice(2);

// Expand a leading `~` ourselves: Windows shells (cmd/PowerShell) don't do it,
// so `clipjoin --out ~/Desktop` would otherwise create a literal "~" folder.
function expandTilde(p: string): string {
  if (p === "~") return os.homedir();
  if (p.startsWith("~/") || p.startsWith("~\\")) return path.join(os.homedir(), p.slice(2));
  return p;
}

// `--version` / `-v`: print the package version and exit before starting the UI.
// package.json sits one level above the built entry (dist/index.js) and is always
// included in the npm tarball, so this resolves for global installs and dev alike.
if (argv.includes("--version") || argv.includes("-v")) {
  const pkgPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json");
  const { version } = JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string };
  console.log(version);
  process.exit(0);
}

// Minimal arg parsing: one optional positional (start folder) plus `--out <dir>`
// (aliases: `-o`, `--out=<dir>`) to redirect where joined videos are written.
let folderArg: string | undefined;
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === "--out" || arg === "-o") {
    const dir = argv[++i];
    if (dir) setOutputDir(expandTilde(dir));
  } else if (arg.startsWith("--out=")) {
    setOutputDir(expandTilde(arg.slice("--out=".length)));
  } else if (!arg.startsWith("-") && folderArg === undefined) {
    folderArg = expandTilde(arg);
  }
}

debugLog(`render start, initialFolder=${folderArg ?? ""}`);
const { waitUntilExit } = render(<App initialFolder={folderArg} />);
await waitUntilExit();
debugLog("waitUntilExit resolved");
