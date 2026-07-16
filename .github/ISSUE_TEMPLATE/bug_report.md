---
name: Bug report
about: Report a problem with ClipJoin
title: "[BUG] "
labels: bug
assignees: ""
---

## Description

A clear and concise description of what the bug is.

## Steps to reproduce

1. ...
2. ...
3. ...

## Expected behavior

What you expected to happen.

## Actual behavior

What actually happened instead.

## Environment

- **OS**: (e.g., macOS 14.0, Ubuntu 22.04)
- **Node version**: (output of `node --version`)
- **pnpm version**: (output of `pnpm --version`)
- **ffmpeg version**: (output of `ffmpeg -version`)
- **ClipJoin version/commit**: (if applicable)

## Video details (if join-related)

- **Clip formats**: (e.g., MP4 H.264, MOV ProRes)
- **Codecs**: (output of `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1:noprint_filename=1 <file>`)
- **Resolution(s)**: (e.g., 1920x1080, mixed)
- **Approximate file size**: (total clips and individual size if relevant)

## Additional context

Add any other context or screenshots that might help diagnose the issue.

## Solution (optional)

If you have an idea how to fix this, describe it here.
