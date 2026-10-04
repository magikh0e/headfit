#!/usr/bin/env bash
# Render one of the hand-drawn svg cards to png with headless Chrome.
#
#   tools/make-card.sh og-github  og-github.svg   -> og-github.png
#   tools/make-card.sh banner     docs/banner.svg -> docs/banner.png
#
# The svg is the source and the png is output, so the pngs are here only because
# GitHub and every link preview want a raster. Redraw the svg, re-run this.
#
# The Open Graph card for the page itself is deliberately not here. It belongs
# to printvault.magikh0e.pl, which serves the page, so it is site/og-headfit.svg
# in that repo and is rendered and deployed by its tools/make-og.sh. A copy
# lived here for a week and was identical to that one, which is exactly how a
# second copy starts: harmless until somebody edits one of them.
#
# Chrome letterboxes or crops anything that does not match the window, so the
# size is read off the file rather than hardcoded: the cards are not all one
# shape. Open Graph asks for 1200x630, a repo social preview for 1280x640, and
# the README banner is wider than either because it sits above the first
# paragraph and a 640 tall image buries it.

set -euo pipefail

cd "$(dirname "$0")/.."
NAME=${1:-og-github}
SVG=$NAME.svg
[ -f "$SVG" ] || SVG=docs/$NAME.svg
[ -f "$SVG" ] || { echo "no $NAME.svg here or in docs/" >&2; exit 1; }
PNG=${SVG%.svg}.png

W=$(sed -n 's/.*<svg[^>]* width="\([0-9]*\)".*/\1/p' "$SVG" | head -1)
H=$(sed -n 's/.*<svg[^>]* height="\([0-9]*\)".*/\1/p' "$SVG" | head -1)
[ -n "$W" ] && [ -n "$H" ] || { echo "$SVG has no width/height on its <svg> tag" >&2; exit 1; }

CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe"
[ -x "$CHROME" ] || CHROME="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
[ -x "$CHROME" ] || { echo "no Chrome or Edge found, cannot render" >&2; exit 1; }

HERE=$(pwd -W 2>/dev/null || pwd)
echo "rendering $SVG at ${W}x${H}"
"$CHROME" --headless --disable-gpu --hide-scrollbars \
  --window-size="$W","$H" \
  --screenshot="$HERE/$PNG" \
  "file:///$HERE/$SVG" 2>/dev/null

echo "$PNG is $(( $(wc -c < "$PNG") / 1024 )) KB"
