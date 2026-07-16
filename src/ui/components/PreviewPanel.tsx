import React from "react";
import path from "node:path";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import type { Clip, Transition } from "../../core/types.js";
import { canLossless } from "../../core/videos.js";
import { humanSize, humanTime } from "../../core/format.js";
import { TRANSITION_DURATION_SEC, TRANSITIONS } from "../../config.js";
import { theme } from "../theme.js";

interface Props {
  clips: Clip[];
  outputPath: string;
  transition: Transition;
  /** Filename being edited, or null when not editing. */
  editingValue: string | null;
  onChangeEditing: (value: string) => void;
  onSubmitEditing: (value: string) => void;
}

export function PreviewPanel({
  clips,
  outputPath,
  transition,
  editingValue,
  onChangeEditing,
  onSubmitEditing,
}: Props) {
  const included = clips.filter((c) => c.included);
  const totalSize = included.reduce((s, c) => s + c.sizeBytes, 0);
  const hasTransition = transition !== "none" && included.length >= 2;
  // Crossfades overlap, so each boundary shortens the output by the overlap.
  const overlap = hasTransition ? (included.length - 1) * TRANSITION_DURATION_SEC : 0;
  const totalDuration = Math.max(0, included.reduce((s, c) => s + c.durationSec, 0) - overlap);
  const transitionLabel = TRANSITIONS.find((t) => t.id === transition)?.label ?? "None";
  const lossless = canLossless(clips) && !hasTransition;

  const folder = path.basename(path.dirname(outputPath));
  const filename = path.basename(outputPath);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.brand}
      paddingX={1}
      marginLeft={1}
      flexGrow={1}
    >
      <Text color={theme.muted} bold>
        Preview
      </Text>
      <Text>
        {included.length}/{clips.length} clips
      </Text>
      <Text>⏱ {humanTime(totalDuration)}</Text>
      <Text>💾 {humanSize(totalSize)}</Text>
      <Text color={hasTransition ? undefined : theme.muted}>
        {hasTransition ? "🎬 " : ""}Transition: {transitionLabel}
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Text color={theme.muted}>Output → {folder}/</Text>
        {editingValue !== null ? (
          <TextInput value={editingValue} onChange={onChangeEditing} onSubmit={onSubmitEditing} />
        ) : (
          <Text color={theme.warn}>{filename}</Text>
        )}
      </Box>
      <Box marginTop={1}>
        {lossless ? (
          <Text color={theme.success}>✓ lossless (fast)</Text>
        ) : (
          <Text color={theme.warn}>⟳ will re-encode{hasTransition ? " (transition)" : ""}</Text>
        )}
      </Box>
      {/* Always rendered (a blank space when inactive) so the panel keeps a
          constant height — toggling a transition never resizes the box. */}
      <Text color={theme.muted}>{hasTransition ? "takes longer to render" : " "}</Text>
    </Box>
  );
}
