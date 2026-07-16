import React from "react";
import { Box, Text } from "ink";
import { theme } from "../theme.js";

// 4-row block font; each glyph's rows are equal width so words align by construction.
const FONT: Record<string, string[]> = {
  C: ["█████", "██   ", "██   ", "█████"],
  L: ["██  ", "██  ", "██  ", "████"],
  I: ["██", "██", "██", "██"],
  P: ["█████", "██ ██", "█████", "██   "],
  J: ["   ██", "   ██", "██ ██", "████ "],
  O: ["█████", "██ ██", "██ ██", "█████"],
  N: ["██  ██", "███ ██", "██ ███", "██  ██"],
};

const ROWS = 4;

export function renderWord(word: string): string[] {
  const glyphs = [...word.toUpperCase()].map((ch) => FONT[ch] ?? ["  ", "  ", "  ", "  "]);
  return Array.from({ length: ROWS }, (_, r) => glyphs.map((g) => g[r]).join(" "));
}

const LOGO = renderWord("ClipJoin");

interface Props {
  tagline?: boolean;
  align?: "left" | "center";
}

export function Banner({ tagline = false, align = "left" }: Props) {
  return (
    <Box flexDirection="column" alignItems={align === "center" ? "center" : "flex-start"}>
      {LOGO.map((line, i) => (
        <Text key={i} color={theme.logo} bold>
          {line}
        </Text>
      ))}
      {tagline && <Text color={theme.muted}>✦ join your clips ✦</Text>}
    </Box>
  );
}
