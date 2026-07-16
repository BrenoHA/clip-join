import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DEFAULT_EXTS } from "../../config.js";
import { theme } from "../theme.js";
import { KeyHints } from "../components/KeyHints.js";

interface Entry {
  name: string;
  path: string;
  isDir: boolean;
  isVideo: boolean;
  selected: boolean;
}

interface Props {
  /** Called with the chosen video file paths. */
  onConfirm: (files: string[]) => void;
  onQuit: () => void;
}

const VIDEO_EXTS = new Set(DEFAULT_EXTS);
const VISIBLE = 12;

function isVideoFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return VIDEO_EXTS.has(ext);
}

export function BrowseScreen({ onConfirm, onQuit }: Props) {
  const [dir, setDir] = useState(process.cwd());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function load(target: string, selectName?: string) {
    try {
      const dirents = await fs.readdir(target, { withFileTypes: true });
      const list: Entry[] = dirents
        .filter((d) => !d.name.startsWith("."))
        .map((d) => ({
          name: d.name,
          path: path.join(target, d.name),
          isDir: d.isDirectory(),
          isVideo: d.isFile() && isVideoFile(d.name),
          selected: selected.has(path.join(target, d.name)),
        }))
        .sort((a, b) => {
          if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });
      setEntries(list);
      const idx = selectName ? list.findIndex((e) => e.name === selectName) : -1;
      setCursor(idx >= 0 ? idx : 0);
      setDir(target);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    void load(process.cwd());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const videoCountHere = entries.filter((e) => e.isVideo).length;

  useInput((input, key) => {
    if (input === "q") return onQuit();

    if (key.upArrow) {
      setCursor((c) => (c > 0 ? c - 1 : entries.length - 1));
    } else if (key.downArrow) {
      setCursor((c) => (c < entries.length - 1 ? c + 1 : 0));
    } else if (key.return || input === " ") {
      const entry = entries[cursor];
      if (!entry) return;
      if (entry.isDir) {
        void load(entry.path);
      } else if (entry.isVideo) {
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(entry.path)) next.delete(entry.path);
          else next.add(entry.path);
          return next;
        });
        setEntries((prev) =>
          prev.map((e, i) => (i === cursor ? { ...e, selected: !e.selected } : e))
        );
      }
    } else if (key.leftArrow || key.backspace || key.delete) {
      const parent = path.dirname(dir);
      // Coming back up, land the cursor on the folder we just left.
      if (parent !== dir) void load(parent, path.basename(dir));
    } else if (input === "~") {
      void load(os.homedir());
    } else if (input === "s") {
      const all = entries.filter((e) => e.isVideo).map((e) => e.path);
      if (all.length > 0) onConfirm(all);
    } else if (input === "c") {
      if (selected.size > 0) onConfirm([...selected]);
    }
  });

  const start = Math.max(
    0,
    Math.min(cursor - Math.floor(VISIBLE / 2), Math.max(0, entries.length - VISIBLE))
  );
  const window = entries.slice(start, start + VISIBLE);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text color={theme.muted}>📁 {dir}</Text>

      <Box flexDirection="column" borderStyle="round" borderColor={theme.muted} paddingX={1} marginY={1}>
        {error ? (
          <Text color={theme.danger}>{error}</Text>
        ) : window.length === 0 ? (
          <Text color={theme.muted}>(empty)</Text>
        ) : (
          window.map((entry, i) => {
            const idx = start + i;
            const active = idx === cursor;
            const icon = entry.isDir ? "📁" : entry.isVideo ? "🎬" : "  ";
            const check = entry.isVideo ? (entry.selected ? "[x]" : "[ ]") : "   ";
            return (
              <Text key={entry.path} color={active ? theme.brand : undefined} inverse={active}>
                {active ? "▸ " : "  "}
                {check} {icon} {entry.name}
                {entry.isDir ? "/" : ""}
              </Text>
            );
          })
        )}
      </Box>

      <Text color={theme.muted}>
        {videoCountHere} video(s) here · {selected.size} selected
      </Text>

      <KeyHints
        lines={[
          [
            { keys: "↑↓", label: "move" },
            { keys: "space/enter", label: "open dir / select file" },
            { keys: "←/⌫", label: "up" },
            { keys: "~", label: "home" },
          ],
          [
            { keys: "s", label: "use whole folder", primary: true },
            { keys: "c", label: `continue with selected (${selected.size})`, primary: true },
            { keys: "q", label: "quit" },
          ],
        ]}
      />
    </Box>
  );
}
