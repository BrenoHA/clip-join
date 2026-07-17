import React, { useEffect, useRef, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import Spinner from "ink-spinner";
import path from "node:path";
import { defaultOutputName } from "../config.js";
import { checkDeps, probeClips, type DepStatus } from "../core/probe.js";
import { findVideos, sortClips } from "../core/videos.js";
import { runJoin } from "../core/join.js";
import { resolveOutputPath } from "../core/output.js";
import type { Clip, JoinMode, JoinResult, Transition } from "../core/types.js";
import { useFullscreen } from "./hooks/useFullscreen.js";
import { theme } from "./theme.js";
import { Header } from "./components/Header.js";
import { SplashScreen } from "./screens/SplashScreen.js";
import { BrowseScreen } from "./screens/BrowseScreen.js";
import { EditScreen } from "./screens/EditScreen.js";
import { JoinScreen } from "./screens/JoinScreen.js";
import { SummaryScreen } from "./screens/SummaryScreen.js";

type Phase =
  | "splash"
  | "missingdeps"
  | "browse"
  | "probing"
  | "edit"
  | "joining"
  | "done"
  | "error";

interface Props {
  /** Optional folder passed on the command line. */
  initialFolder?: string;
}

export function App({ initialFolder }: Props) {
  useFullscreen();
  const { exit } = useApp();

  const [phase, setPhase] = useState<Phase>("splash");
  const [deps, setDeps] = useState<DepStatus | null>(null);
  const [splashDone, setSplashDone] = useState(false);
  const [clips, setClips] = useState<Clip[]>([]);
  const [outputName, setOutputName] = useState(defaultOutputName);
  const [transition, setTransition] = useState<Transition>("none");
  const [probeDone, setProbeDone] = useState(0);
  const [probeTotal, setProbeTotal] = useState(0);
  const [progress, setProgress] = useState<{ fraction: number; mode: JoinMode }>({
    fraction: 0,
    mode: "lossless",
  });
  const [result, setResult] = useState<JoinResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const lastPaint = useRef(0);

  // Kick off the dep check immediately so it overlaps the splash animation.
  useEffect(() => {
    void checkDeps().then(setDeps);
  }, []);

  // Route once the splash is done AND deps have resolved.
  useEffect(() => {
    if (phase !== "splash" || !splashDone || !deps) return;
    if (!deps.ok) {
      setPhase("missingdeps");
    } else if (initialFolder) {
      void (async () => {
        const files = await findVideos(path.resolve(initialFolder)).catch(() => []);
        await beginProbe(files);
      })();
    } else {
      setPhase("browse");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, splashDone, deps]);

  async function beginProbe(files: string[]) {
    if (files.length === 0) {
      setErrorMsg("No videos found in that folder.");
      setPhase("error");
      return;
    }
    setProbeTotal(files.length);
    setProbeDone(0);
    setPhase("probing");
    try {
      const probed = await probeClips(files, (done) => setProbeDone(done));
      setClips(sortClips(probed, "date"));
      setOutputName(defaultOutputName()); // fresh timestamped name per session
      setTransition("none");
      setPhase("edit");
    } catch (e) {
      // Never leave the user stranded on the spinner if probing blows up.
      setErrorMsg((e as Error).message || "Failed to read clip metadata.");
      setPhase("error");
    }
  }

  async function startJoin() {
    setPhase("joining");
    setProgress({ fraction: 0, mode: "lossless" });
    try {
      const res = await runJoin({
        clips,
        output: resolveOutputPath(outputName),
        transition,
        onProgress: (p) => {
          // Throttle repaints to ~15/s to keep the bar smooth without flicker.
          const now = Date.now();
          if (now - lastPaint.current > 66 || p.fraction >= 1) {
            lastPaint.current = now;
            setProgress({ fraction: p.fraction, mode: p.mode });
          }
        },
      });
      setResult(res);
      setPhase("done");
    } catch (e) {
      setErrorMsg((e as Error).message);
      setPhase("error");
    }
  }

  useInput((input) => input === "q" && exit(), {
    isActive: phase === "missingdeps" || phase === "error",
  });

  // The splash owns the whole screen; every other phase gets the persistent
  // ClipJoin header (the ASCII logo stays pinned once the animation is done).
  if (phase === "splash") {
    return <SplashScreen onDone={() => setSplashDone(true)} />;
  }

  const subtitles: Record<Exclude<Phase, "splash">, string> = {
    missingdeps: "Setup needed",
    browse: "Browse to your clips",
    probing: "Reading clips",
    edit: "Arrange your clips",
    joining: "Joining",
    done: "Done",
    error: "Error",
  };

  let body: React.ReactNode = null;
  switch (phase) {
    case "missingdeps":
      body = (
        <Box flexDirection="column" paddingX={1}>
          <Text bold color={theme.danger}>
            ffmpeg / ffprobe not found on your PATH.
          </Text>
          <Box marginTop={1}>
            <Text>ClipJoin needs ffmpeg to read and join videos. Install it with:</Text>
          </Box>
          <Text color={theme.brand}> brew install ffmpeg</Text>
          <Box marginTop={1}>
            <Text color={theme.muted}>Press q to quit, then re-run clip-join.</Text>
          </Box>
        </Box>
      );
      break;

    case "browse":
      body = <BrowseScreen onConfirm={(files) => void beginProbe(files)} onQuit={exit} />;
      break;

    case "probing":
      body = <Centered spinner text={`Reading clip metadata… ${probeDone}/${probeTotal}`} />;
      break;

    case "edit":
      body = (
        <EditScreen
          clips={clips}
          setClips={setClips}
          outputName={outputName}
          setOutputName={setOutputName}
          transition={transition}
          setTransition={setTransition}
          onJoin={() => void startJoin()}
          onBack={() => setPhase("browse")}
          onQuit={exit}
        />
      );
      break;

    case "joining":
      body = <JoinScreen fraction={progress.fraction} mode={progress.mode} />;
      break;

    case "done":
      body = result ? (
        <SummaryScreen
          result={result}
          onAgain={() => {
            setResult(null);
            setPhase("browse");
          }}
          onQuit={exit}
        />
      ) : null;
      break;

    case "error":
      body = (
        <Box flexDirection="column" paddingX={1}>
          <Text bold color={theme.danger}>
            Something went wrong
          </Text>
          <Box marginTop={1}>
            <Text color={theme.muted}>{errorMsg}</Text>
          </Box>
          <Box marginTop={1}>
            <Text color={theme.muted}>Press q to quit.</Text>
          </Box>
        </Box>
      );
      break;
  }

  return (
    <Box flexDirection="column">
      <Header subtitle={subtitles[phase]} />
      {body}
    </Box>
  );
}

function Centered({ text, spinner }: { text: string; spinner?: boolean }) {
  return (
    <Box paddingX={1} paddingY={1}>
      {spinner && (
        <Text color={theme.success}>
          <Spinner type="dots" />{" "}
        </Text>
      )}
      <Text>{text}</Text>
    </Box>
  );
}
