# ClipJoin

An interactive terminal app for joining videos into one file. Browse to your
clips, pick which ones to include, reorder them, and merge — **losslessly when
possible**, so 40×1GB clips join in seconds, not hours.

Built with [Ink](https://github.com/vadimdemedes/ink) (React for the terminal),
the same UI framework behind Claude Code.

A "clips merging" animation plays on launch, then the wordmark stays pinned as a
warm header above every screen:

```
█████ ██   ██ █████    ██ █████ ██ ██  ██
██    ██   ██ ██ ██    ██ ██ ██ ██ ███ ██
██    ██   ██ █████ ██ ██ ██ ██ ██ ██ ███
█████ ████ ██ ██    ████  █████ ██ ██  ██
 · arrange your clips

 ╭─────────────────────────────────────────╮ ╭───────────────────────╮
 │ Clips (3)                                │ │ Preview               │
 │ ▸  1. [x] GX010830.MP4        00:22      │ │ 3/3 clips             │
 │    2. [x] GX010831.MP4        00:10      │ │ ⏱ 00:00:54            │
 │    3. [x] GX010832.MP4        00:21      │ │ 💾 394.1MB            │
 │                                          │ │ Output → output/      │
 │                                          │ │ joined_output_…mp4    │
 │                                          │ │ ✓ lossless (fast)     │
 ╰─────────────────────────────────────────╯ ╰───────────────────────╯

 ↑↓ move · space/enter toggle · Shift+↑↓ reorder · o rename output
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
   loss, works when clips share a codec/resolution. If that fails (e.g. mixed formats
   or codecs) it **re-encodes** automatically (H.264/AAC, slower but always works).

Every joined file is written to the **`output/`** folder with a timestamped default
name (`joined_output_YYYY-MM-DD_HHMMSS.mp4`), so repeated joins never overwrite one another.

## Requirements

- **Node.js 18+**
- **pnpm** (this project uses pnpm; the easiest way to get it is `corepack enable pnpm`)
- **ffmpeg** (bundles `ffprobe`) on your `PATH`

```bash
brew install ffmpeg      # macOS; use your package manager elsewhere
corepack enable pnpm     # if you don't already have pnpm
pnpm install
pnpm build
```

## Usage

```bash
pnpm dev                 # dev mode, no build step (via tsx)
pnpm start               # after `pnpm build`
pnpm start ~/clips       # jump straight into a folder
```

Everything is keyboard-driven.

**Browsing**

| Key | Action |
|---|---|
| `↑ ↓` | Move the cursor |
| `space` / `Enter` | Open a directory, or select/deselect a video file |
| `←` / `Backspace` / `Delete` | Up a directory (cursor lands on the folder you left) |
| `~` | Jump to your home directory |
| `s` | Use every video in the current folder |
| `c` | Continue with the files you've selected |
| `q` | Quit |

**Arranging & joining**

| Key | Action |
|---|---|
| `↑ ↓` | Move the cursor |
| `space` / `Enter` | Toggle a clip in/out of the join |
| `Shift+↑ ↓` | Reorder the selected clip |
| `o` | Rename the output file (saved into `output/`) |
| `j` | **▶ Start the join** |
| `esc` | Back to the browser |
| `r` | Join again (summary screen) |
| `q` | Quit |

## Project structure

```
src/
  index.tsx            # CLI entry (bin: clip-join)
  config.ts            # extensions, output dir, default name, encode settings
  core/                # domain logic, no UI — unit-testable
    videos · probe · join · output · format · types
  ui/                  # Ink presentation layer
    App.tsx            # phase router (splash → browse → edit → join → summary)
    theme.ts
    screens/           # SplashScreen, BrowseScreen, EditScreen, JoinScreen, SummaryScreen
    components/        # Banner, Header, PreviewPanel, ProgressBar, KeyHints
    hooks/             # useFullscreen
```

`core/` never imports Ink, so the engine can be exercised without a terminal.

## Roadmap

- Transitions between clips (crossfade/dissolve via ffmpeg `xfade`/`acrossfade`) — opt-in,
  since transitions require re-encoding.
- Per-clip trimming (in/out points).
- Audio normalization.

Mixed file types / codecs already work today via the automatic re-encode fallback.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, coding
conventions, and the PR process.

## Notes

- A successful lossless stream copy doesn't guarantee every player handles a file with
  slightly different per-clip encoding perfectly — if playback looks off, the clips
  likely need re-encoding (ClipJoin falls back automatically when stream copy fails).
- **Original files are never modified or deleted.**
- Output names are always confined to `output/` (a path typed into the rename field is
  reduced to its basename).

## License

[MIT](LICENSE) © BrenoHA
