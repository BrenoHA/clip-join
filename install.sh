#!/usr/bin/env bash
#
# ClipJoin installer — https://github.com/BrenoHA/clip-join
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/BrenoHA/clip-join/main/install.sh | bash
#
# Installs the `clipjoin` command globally via npm. Checks for Node and ffmpeg
# first and guides you if either is missing.

set -euo pipefail

# --- pretty output (falls back to plain text when stdout is not a terminal) ---
if [ -t 1 ]; then
  BOLD='\033[1m'; RED='\033[31m'; GREEN='\033[32m'; YELLOW='\033[33m'; DIM='\033[2m'; RESET='\033[0m'
else
  BOLD=''; RED=''; GREEN=''; YELLOW=''; DIM=''; RESET=''
fi
info()  { printf '%b\n' "${BOLD}==>${RESET} $1"; }
ok()    { printf '%b\n' "${GREEN}✓${RESET} $1"; }
warn()  { printf '%b\n' "${YELLOW}!${RESET} $1"; }
err()   { printf '%b\n' "${RED}✗${RESET} $1" >&2; }

# --- detect OS for package-manager hints ---
OS="$(uname -s)"
case "$OS" in
  Darwin) PLATFORM="macOS" ;;
  Linux)  PLATFORM="Linux" ;;
  *)      PLATFORM="$OS" ;;
esac

# --- 1. Node.js >= 18 ---
if ! command -v node >/dev/null 2>&1; then
  err "Node.js is not installed."
  echo
  echo "ClipJoin needs Node.js 18 or newer. Install it, then re-run this script:"
  if [ "$PLATFORM" = "macOS" ]; then
    echo "  brew install node                 # macOS (Homebrew)"
  else
    echo "  sudo apt install nodejs npm       # Debian/Ubuntu"
  fi
  echo "  https://nodejs.org/                # or download from nodejs.org"
  echo "  https://github.com/nvm-sh/nvm      # or use nvm to manage versions"
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  err "Node.js $(node -v) is too old — ClipJoin needs 18 or newer."
  echo "Upgrade Node (https://nodejs.org/ or nvm) and re-run this script."
  exit 1
fi
ok "Node.js $(node -v)"

if ! command -v npm >/dev/null 2>&1; then
  err "npm is not installed (it normally ships with Node.js)."
  echo "Install npm alongside Node.js and re-run this script."
  exit 1
fi

# --- 2. ffmpeg + ffprobe (required at runtime, not for install) ---
FFMPEG_OK=1
for tool in ffmpeg ffprobe; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    FFMPEG_OK=0
  fi
done
if [ "$FFMPEG_OK" -eq 1 ]; then
  ok "ffmpeg + ffprobe found"
else
  warn "ffmpeg/ffprobe not found — ClipJoin needs them to join videos."
  if [ "$PLATFORM" = "macOS" ]; then
    echo "    Install with: brew install ffmpeg"
  else
    echo "    Install with: sudo apt install ffmpeg"
  fi
  echo "    ${DIM}Installation will continue; install ffmpeg before running clipjoin.${RESET}"
fi

# --- 3. install ClipJoin globally ---
info "Installing clip-join globally (npm i -g clip-join)…"
if ! npm install -g clip-join; then
  err "Global install failed."
  echo "If it's a permissions error, either:"
  echo "  • configure an npm prefix you own: https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally"
  echo "  • or re-run with sudo:  sudo npm install -g clip-join"
  exit 1
fi

# --- 4. verify clipjoin is on PATH ---
if command -v clipjoin >/dev/null 2>&1; then
  ok "Installed! Run ${BOLD}clipjoin${RESET} to get started."
else
  warn "clip-join was installed, but 'clipjoin' isn't on your PATH yet."
  NPM_BIN="$(npm prefix -g 2>/dev/null)/bin"
  echo
  echo "Add npm's global bin directory to your PATH. It's here:"
  echo "  ${BOLD}${NPM_BIN}${RESET}"
  echo
  case "${SHELL:-}" in
    */zsh)  RC="$HOME/.zshrc" ;;
    */bash) RC="$HOME/.bashrc" ;;
    */fish) RC="$HOME/.config/fish/config.fish" ;;
    *)      RC="your shell's startup file" ;;
  esac
  if [ "${SHELL:-}" = "${SHELL%fish}" ] || [ -z "${SHELL:-}" ]; then
    echo "Append this line to ${BOLD}${RC}${RESET}, then open a new terminal:"
    echo "  export PATH=\"${NPM_BIN}:\$PATH\""
  else
    echo "Add it in ${BOLD}${RC}${RESET}, then open a new terminal:"
    echo "  fish_add_path ${NPM_BIN}"
  fi
fi
