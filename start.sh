#!/usr/bin/env bash
# Serves this folder as a static site at http://localhost:8003 (override with PORT=1234 ./start.sh)
cd "$(dirname "$0")" || exit 1
PORT="${PORT:-8003}"

# python3 is checked last: on Windows it can be a Microsoft Store stub that does nothing
for py in python py python3; do
  if "$py" --version >/dev/null 2>&1; then
    echo "Serving on http://localhost:$PORT (Ctrl+C to stop)"
    exec "$py" -m http.server "$PORT"
  fi
done

echo "Python not found. Alternative: npx serve ."
exit 1
