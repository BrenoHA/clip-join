import { useStdout } from "ink";
import { useEffect, useState } from "react";
import { debugLog } from "../../debug.js";

/** Run full-screen via the alternate screen buffer, restoring scrollback on exit. */
export function useFullscreen(): { columns: number; rows: number } {
  const { stdout } = useStdout();
  const [size, setSize] = useState({
    columns: stdout.columns ?? 80,
    rows: stdout.rows ?? 24,
  });

  useEffect(() => {
    stdout.write("\x1b[?1049h\x1b[H"); // enter alternate screen, cursor home
    const onResize = () => {
      debugLog(`resize event -> ${stdout.columns}x${stdout.rows}`);
      setSize({ columns: stdout.columns ?? 80, rows: stdout.rows ?? 24 });
    };
    stdout.on("resize", onResize);
    return () => {
      stdout.off("resize", onResize);
      stdout.write("\x1b[?1049l"); // leave alternate screen
    };
  }, [stdout]);

  return size;
}
