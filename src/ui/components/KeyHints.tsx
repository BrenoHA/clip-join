import React from "react";
import { Box, Text } from "ink";
import { theme } from "../theme.js";

export interface Hint {
  keys: string;
  label: string;
  primary?: boolean;
}

interface Props {
  lines: Hint[][];
}

export function KeyHints({ lines }: Props) {
  return (
    <Box flexDirection="column" marginTop={1}>
      {lines.map((line, i) => (
        <Text key={i} color={theme.muted}>
          {line.map((hint, j) => (
            <Text key={j}>
              {j > 0 ? " · " : ""}
              <Text color={hint.primary ? theme.success : theme.key}>{hint.keys}</Text>{" "}
              {hint.label}
            </Text>
          ))}
        </Text>
      ))}
    </Box>
  );
}
