import React from "react";
import path from "node:path";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import type { Clip } from "../../core/types.js";
import { canLossless } from "../../core/videos.js";
import { humanSize, humanTime } from "../../core/format.js";
import { theme } from "../theme.js";

interface Props {
  clips: Clip[];
  outputPath: string;
  /** Filename being edited, or null when not editing. */
  editingValue: string | null;
  onChangeEditing: (value: string) => void;
  onSubmitEditing: (value: string) => void;
}

export function PreviewPanel({
  clips,
  outputPath,
  editingValue,
  onChangeEditing,
  onSubmitEditing,
}: Props) {
  const included = clips.filter((c) => c.included);
  const totalDuration = included.reduce((s, c) => s + c.durationSec, 0);
  const totalSize = included.reduce((s, c) => s + c.sizeBytes, 0);
  const lossless = canLossless(clips);

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
          <Text color={theme.warn}>⟳ will re-encode</Text>
        )}
      </Box>
    </Box>
  );
}
