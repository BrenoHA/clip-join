#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { App } from "./ui/App.js";

const folderArg = process.argv[2];

const { waitUntilExit } = render(<App initialFolder={folderArg} />);
await waitUntilExit();
