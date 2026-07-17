import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import path from "node:path";
import type { Clip, Transition } from "../../core/types.js";
import { humanClock, humanDate } from "../../core/format.js";
import { resolveOutputPath } from "../../core/output.js";
import { TRANSITIONS } from "../../config.js";
import { theme } from "../theme.js";
import { PreviewPanel } from "../components/PreviewPanel.js";
import { KeyHints } from "../components/KeyHints.js";

interface Props {
  clips: Clip[];
  setClips: (clips: Clip[]) => void;
  outputName: string;
  setOutputName: (name: string) => void;
  transition: Transition;
  setTransition: (t: Transition) => void;
  onJoin: () => void;
  onBack: () => void;
  onQuit: () => void;
}

const VISIBLE = 12;

export function EditScreen({
  clips,
  setClips,
  outputName,
  setOutputName,
  transition,
  setTransition,
  onJoin,
  onBack,
  onQuit,
}: Props) {
  const [cursor, setCursor] = useState(0);
  const [editingOutput, setEditingOutput] = useState(false);
  const [draftOutput, setDraftOutput] = useState(outputName);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= clips.length) return;
    const next = [...clips];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setClips(next);
    setCursor(to);
  };

  useInput((input, key) => {
    if (editingOutput) return; // TextInput owns keystrokes while editing

    if (input === "q") return onQuit();
    if (key.escape) return onBack();

    if (key.upArrow) {
      if (key.shift) move(cursor, cursor - 1);
      else setCursor((c) => (c > 0 ? c - 1 : clips.length - 1));
    } else if (key.downArrow) {
      if (key.shift) move(cursor, cursor + 1);
      else setCursor((c) => (c < clips.length - 1 ? c + 1 : 0));
    } else if (input === " " || key.return) {
      setClips(clips.map((c, i) => (i === cursor ? { ...c, included: !c.included } : c)));
    } else if (input === "o") {
      setDraftOutput(outputName);
      setEditingOutput(true);
    } else if (input === "t") {
      const idx = TRANSITIONS.findIndex((t) => t.id === transition);
      setTransition(TRANSITIONS[(idx + 1) % TRANSITIONS.length].id);
    } else if (input === "j") {
      // j = Join. (Enter toggles the clip; it never starts the join.)
      if (clips.some((c) => c.included)) onJoin();
    }
  });

  const included = clips.filter((c) => c.included);
  const transitionLabel = TRANSITIONS.find((t) => t.id === transition)?.label ?? "None";

  const start = Math.max(
    0,
    Math.min(cursor - Math.floor(VISIBLE / 2), Math.max(0, clips.length - VISIBLE))
  );
  const window = clips.slice(start, start + VISIBLE);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Box flexDirection="column" borderStyle="round" borderColor={theme.muted} paddingX={1} width="65%">
          <Text color={theme.muted} bold>
            Clips ({clips.length})
          </Text>
          {window.map((clip, i) => {
            const idx = start + i;
            const active = idx === cursor;
            const num = String(idx + 1).padStart(2, " ");
            return (
              <Text
                key={clip.id}
                color={active ? theme.brand : clip.included ? undefined : theme.muted}
                inverse={active}
              >
                {active ? "▸" : " "} {num}. {clip.included ? "[x]" : "[ ]"}{" "}
                {clip.name.padEnd(16).slice(0, 16)} {humanClock(clip.durationSec)}
                {" "}
                {humanDate(clip.mtime)}
              </Text>
            );
          })}
        </Box>

        <PreviewPanel
          clips={clips}
          outputPath={resolveOutputPath(outputName)}
          transition={transition}
          editingValue={editingOutput ? draftOutput : null}
          onChangeEditing={setDraftOutput}
          onSubmitEditing={(val) => {
            const base = path.basename(val.trim());
            setOutputName(base || outputName);
            setEditingOutput(false);
          }}
        />
      </Box>

      <KeyHints
        lines={[
          [
            { keys: "↑↓", label: "move" },
            { keys: "space/enter", label: "toggle" },
            { keys: "Shift+↑↓", label: "reorder" },
            { keys: "o", label: "rename output" },
            { keys: "t", label: `transition: ${transitionLabel}` },
          ],
          [
            { keys: "j", label: `▶ JOIN${included.length === 0 ? " (select a clip first)" : ""}`, primary: true },
            { keys: "esc", label: "back" },
            { keys: "q", label: "quit" },
          ],
        ]}
      />
    </Box>
  );
}
