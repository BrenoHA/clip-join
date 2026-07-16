# ClipJoin

An interactive terminal app for joining videos into one file. Browse to your
clips, select which ones to include, reorder them, and merge — **losslessly when
possible**, so 40×1GB clips join in seconds, not hours.

Built with [Ink](https://github.com/vadimdemedes/ink) (React for the terminal),
the same UI framework behind Claude Code.

A "clips merging" animation plays on launch, then the wordmark stays pinned as a
warm header above every screen:

```
 ████  ██    ██ █████     ██  ████  ██ ██  ██
██     ██    ██ ██  ██    ██ ██  ██ ██ ███ ██
██     ██    ██ █████     ██ ██  ██ ██ ██████
██     ██    ██ ██     ██ ██ ██  ██ ██ ██ ███
 ████  █████ ██ ██      ███   ████  ██ ██  ██
 · arrange your clips

 ╭─────────────────────────────────────────╮ ╭───────────────────────╮
 │ Clips (3)                                │ │ Preview               │
 │ ▸  1. [x] GX010830.MP4        00:42      │ │ 3/3 clips             │
 │    2. [x] GX010831.MP4        00:38      │ │ ⏱ 00:00:54            │
 │    3. [x] GX010832.MP4        00:21      │ │ 💾 394.1MB            │
 │                                          │ │ Output:               │
 │                                          │ │ output/joined…mp4     │
 │                                          │ │ ✓ lossless (fast)     │
 ╰─────────────────────────────────────────╯ ╰───────────────────────╯

 ↑↓ move · space toggle · Shift+↑↓ reorder · o rename output
 j ▶ JOIN · esc back · q quit
```

## How it works

1. A short **clips-merging animation** plays on launch while ClipJoin checks for ffmpeg.
2. **Browse** the filesystem to a folder of clips (or select individual files).
3. Each clip's embedded `creation_time` (falling back to file mtime) sets the true
   capture order — you can then reorder by hand.
4. **Toggle** clips in/out and rename the output, watching the live preview (clip
   count, total duration, size, lossless-vs-re-encode).
5. On join, ClipJoin tries a **lossless concat** (`ffmpeg -c copy`) first — no quality
   loss, works when clips share a codec/resolution. If that fails it **re-encodes**
   automatically (H.264/AAC, slower but always works).

Every joined file is written to the **`output/`** folder.

## Setup

Requires **ffmpeg** (which bundles `ffprobe`) on your `PATH`, plus Node 18+.

```bash
brew install ffmpeg
npm install
npm run build
```

## Usage

```bash
# Dev (no build step, via tsx):
npm run dev

# Or after building:
npm start

# Jump straight into a folder:
npm start -- ~/Downloads/clips
```

Everything is keyboard-driven.

**Browsing**

| Key | Action |
|---|---|
| `↑ ↓` | Move the cursor |
| `Enter` | Open a directory, or select/deselect a video file |
| `←` / `Backspace` | Up a directory |
| `~` | Jump to your home directory |
| `s` | Use every video in the current folder |
| `c` | Continue with the files you've selected |
| `q` | Quit |

**Arranging & joining**

| Key | Action |
|---|---|
| `↑ ↓` | Move the cursor |
| `space` | Toggle a clip in/out of the join |
| `Shift+↑ ↓` | Reorder the selected clip |
| `o` | Rename the output file (saved into `output/`) |
| `j` | **▶ Start the join** |
| `esc` | Back to the browser |
| `r` | Join again (summary screen) |
| `q` | Quit |

## Notes

- A successful lossless stream copy doesn't guarantee every player handles a file
  with slightly different per-clip encoding perfectly — if playback looks off, the
  clips likely need re-encoding (ClipJoin falls back automatically when stream copy
  fails).
- Original files are never modified or deleted.
- Output filenames are always saved inside `output/` (the folder is created
  automatically); a path typed into the rename field is reduced to its basename.
