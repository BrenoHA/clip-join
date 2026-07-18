import React from "react";
import { Box, Text, useInput } from "ink";
import type { JoinResult } from "../../core/types.js";
import { humanSize, humanTime } from "../../core/format.js";
import { theme } from "../theme.js";
import { KeyHints } from "../components/KeyHints.js";

interface Props {
  result: JoinResult;
  onAgain: () => void;
  onQuit: () => void;
}

export function SummaryScreen({ result, onAgain, onQuit }: Props) {
  useInput((input) => {
    if (input === "r") onAgain();
    else if (input === "q") onQuit();
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box flexDirection="column" borderStyle="round" borderColor={theme.success} paddingX={1}>
        <Text>
          <Text color={theme.muted}>Output:   </Text>
          <Text color={theme.warn}>{result.outputPath}</Text>
        </Text>
        <Text>
          <Text color={theme.muted}>Duration: </Text>
          {humanTime(result.durationSec)}
        </Text>
        <Text>
          <Text color={theme.muted}>Size:     </Text>
          {humanSize(result.sizeBytes)}
        </Text>
        <Text>
          <Text color={theme.muted}>Mode:     </Text>
          {result.mode === "lossless" ? (
            <Text color={theme.success}>lossless (stream copy)</Text>
          ) : (
            <Text color={theme.warn}>re-encoded (H.264/AAC)</Text>
          )}
        </Text>
        <Text>
          <Text color={theme.muted}>Elapsed:  </Text>
          {(result.elapsedMs / 1000).toFixed(1)}s
        </Text>
        {result.chaptersPath && (
          <Text>
            <Text color={theme.muted}>Chapters: </Text>
            <Text color={theme.warn}>{result.chaptersPath}</Text>
          </Text>
        )}
      </Box>

      <KeyHints
        lines={[[{ keys: "r", label: "join more", primary: true }, { keys: "q", label: "quit" }]]}
      />
    </Box>
  );
}
