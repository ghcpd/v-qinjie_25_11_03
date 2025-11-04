#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f package.json ]; then
  echo "package.json not found; run this script from within the repository" >&2
  exit 1
fi

npm install
npm test
