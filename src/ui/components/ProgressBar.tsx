import React from "react";
import { Text } from "ink";

interface Props {
  fraction: number;
  width?: number;
  color?: string;
}

export function ProgressBar({ fraction, width = 32, color = "green" }: Props) {
  const clamped = Math.min(1, Math.max(0, fraction));
  const filled = Math.round(clamped * width);
  const bar = "█".repeat(filled) + "░".repeat(width - filled);
  return (
    <Text>
      <Text color={color}>{bar}</Text> {Math.round(clamped * 100)}%
    </Text>
  );
}
