#!/bin/bash
# chmod +x serve.sh
cd "$(dirname "$0")"
echo "Serving at http://localhost:8080"
echo "Press Ctrl+C to stop."
python -m http.server 8080
