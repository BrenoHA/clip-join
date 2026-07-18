# Contributing to ClipJoin

Thanks for your interest in improving ClipJoin! This is a small, focused project,
so the rules are simple.

## Getting started

```bash
git clone <your-fork>
cd clip-join
npm install
npm run dev            # run the app (needs ffmpeg on PATH)
```

You'll need **Node 18+** and **ffmpeg** (which bundles `ffprobe`) installed.

## Before you open a PR

Run these and make sure they're clean:

```bash
npm run typecheck    # tsc, strict mode — must pass
npm test -- --run    # run unit tests — must pass
npm run build        # must build
```

If your change touches the join engine, verify a real merge still works end to end
(point ClipJoin at a folder of clips and confirm the output plays and its duration
matches the sum of the included clips).

## Coding conventions

- **Keep `core/` UI-free.** Modules under `src/core/` must not import Ink or React —
  that's what keeps the engine testable without a terminal. UI lives under `src/ui/`.
- **Screens vs components.** Full-screen phases go in `ui/screens/`; reusable pieces
  (banner, key hints, progress bar, preview) go in `ui/components/`.
- **Colors come from `ui/theme.ts`** — don't hard-code color strings in components.
- **Comment sparingly.** Explain *why* for non-obvious decisions; skip comments that
  just restate the code.
- Match the surrounding style (TypeScript, ESM `.js` import specifiers, 2-space indent).

## Commits & pull requests

- Keep commits focused and follow [Conventional Commits](https://www.conventionalcommits.org):
  `type(scope): summary` — e.g. `feat(join): add crossfade transition option`.
  Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.
- One logical change per PR. Describe what changed and why, and include a screenshot
  or short clip for anything user-facing.
- Link the issue you're addressing, if there is one.

## Reporting bugs & ideas

Open an issue with:
- what you did, what you expected, and what happened,
- your OS, Node version, and `ffmpeg -version`,
- a sample or description of the clips involved (codec/container) when it's a join bug.

Feature ideas are welcome too — check the **Roadmap** in the README first.

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).
