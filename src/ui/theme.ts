/** Single source of truth for ClipJoin's terminal colors. */
export const theme = {
  brand: "cyan",
  /** Calm, warm yellowish tone for the persistent ClipJoin logo. */
  logo: "#E4C88A",
  accent: "magenta",
  muted: "gray",
  /** Soft steel-blue for the phase subtitle — a gentle step up from plain gray. */
  subtitle: "#8FB3C7",
  success: "green",
  warn: "yellow",
  danger: "red",
  key: "white",
} as const;
