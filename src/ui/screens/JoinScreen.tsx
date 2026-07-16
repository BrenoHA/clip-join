import React from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import type { JoinMode } from "../../core/types.js";
import { theme } from "../theme.js";
import { ProgressBar } from "../components/ProgressBar.js";

interface Props {
  fraction: number;
  mode: JoinMode;
}

export function JoinScreen({ fraction, mode }: Props) {
  const label = mode === "lossless" ? "Joining clips…" : "Re-encoding clips…";
  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text color={theme.success}>
          <Spinner type="dots" />
        </Text>
        <Text> {label}</Text>
      </Box>

      <ProgressBar fraction={fraction} color={mode === "lossless" ? theme.success : theme.warn} />

      <Box marginTop={1}>
        <Text color={theme.muted}>
          {mode === "lossless"
            ? "Lossless stream copy — no re-encoding."
            : "Re-encoding to H.264/AAC…"}
        </Text>
      </Box>
    </Box>
  );
}
