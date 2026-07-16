import React, { useEffect, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import { Banner } from "../components/Banner.js";
import { theme } from "../theme.js";

interface Props {
  onDone: () => void;
}

const TRACK = 34;
const CLIP = "▐████▌";
const MERGED = "▐██████████▌";
const CLIP_ROWS = 4; // clip height, matched to the logo so the snap flows into it
const STEPS = 8;
const FRAME_MS = 90;
const CENTER = Math.floor(TRACK / 2);

// One row of the two clips sliding inward toward the center for a given step.
function approachRow(step: number): string {
  const track = Array.from({ length: TRACK }, () => " ");
  const lx = Math.round((step / STEPS) * (CENTER - CLIP.length));
  const rx = TRACK - CLIP.length - lx;
  for (let i = 0; i < CLIP.length; i++) {
    track[lx + i] = CLIP[i];
    track[rx + i] = CLIP[i];
  }
  return track.join("");
}

function mergedRow(): string {
  const pad = Math.floor((TRACK - MERGED.length) / 2);
  return " ".repeat(pad) + MERGED;
}

// Stack a row into a CLIP_ROWS-tall block.
function block(row: string): string[] {
  return Array.from({ length: CLIP_ROWS }, () => row);
}

// Frame milestones: approach (0..STEPS) → snap → banner reveal → brief hold.
const SNAP = STEPS + 1;
const REVEAL = STEPS + 2;
const END = STEPS + 5;

/** Clips-merging intro that reveals the ClipJoin wordmark. Any key skips. */
export function SplashScreen({ onDone }: Props) {
  const [frame, setFrame] = useState(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const finishedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    onDoneRef.current();
  };

  useEffect(() => {
    timerRef.current = setInterval(() => setFrame((f) => f + 1), FRAME_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Complete once we reach the end — in an effect, never inside a setState updater.
  useEffect(() => {
    if (frame >= END) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame]);

  useInput(() => finish()); // any key skips

  const showBanner = frame >= REVEAL;
  const rows = frame >= SNAP ? block(mergedRow()) : block(approachRow(frame));

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      {showBanner ? (
        <Banner />
      ) : (
        <Box flexDirection="column">
          {rows.map((row, i) => (
            <Text key={i} color={theme.logo}>
              {row}
            </Text>
          ))}
          <Box marginTop={1}>
            <Text color={theme.muted}>{frame >= SNAP ? "✦ joining" : "clip + clip"}</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
