export function humanSize(bytes: number): string {
  let n = bytes;
  for (const unit of ["B", "KB", "MB", "GB", "TB"]) {
    if (n < 1024) return `${n.toFixed(1)}${unit}`;
    n /= 1024;
  }
  return `${n.toFixed(1)}PB`;
}

export function humanTime(secs: number): string {
  const total = Math.max(0, Math.floor(secs));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** Compact clock: MM:SS, promoting to HH:MM:SS only when there are hours. */
export function humanClock(secs: number): string {
  const t = humanTime(secs);
  return t.startsWith("00:") ? t.slice(3) : t;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Finder-style modified date in local time, e.g. "Jul 16, 2026, 7:07 PM".
 * Used for the browse screen's Date Modified column.
 */
export function humanDate(d: Date): string {
  const month = MONTHS[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  const min = String(d.getMinutes()).padStart(2, "0");
  const ampm = d.getHours() >= 12 ? "PM" : "AM";
  let hour = d.getHours() % 12;
  if (hour === 0) hour = 12;
  return `${month} ${day}, ${year}, ${hour}:${min} ${ampm}`;
}
