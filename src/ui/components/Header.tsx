import React from "react";
import { Box, Text } from "ink";
import { Banner } from "./Banner.js";
import { theme } from "../theme.js";

interface Props {
  subtitle?: string;
}

export function Header({ subtitle }: Props) {
  return (
    <Box flexDirection="column" paddingX={1} marginBottom={1}>
      <Banner />
      {subtitle ? <Text color={theme.muted}>{subtitle}</Text> : null}
    </Box>
  );
}
