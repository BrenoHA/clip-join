#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { App } from "./ui/App.js";
import { setOutputDir } from "./config.js";

// Minimal arg parsing: one optional positional (start folder) plus `--out <dir>`
// (aliases: `-o`, `--out=<dir>`) to redirect where joined videos are written.
let folderArg: string | undefined;
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === "--out" || arg === "-o") {
    const dir = argv[++i];
    if (dir) setOutputDir(dir);
  } else if (arg.startsWith("--out=")) {
    setOutputDir(arg.slice("--out=".length));
  } else if (!arg.startsWith("-") && folderArg === undefined) {
    folderArg = arg;
  }
}

const { waitUntilExit } = render(<App initialFolder={folderArg} />);
await waitUntilExit();
