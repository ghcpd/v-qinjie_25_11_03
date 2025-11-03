#!/usr/bin/env bash
set -euo pipefail

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required. Install Node.js >= 18.0" >&2
  exit 1
fi

echo "Installing dependencies..."
npm install

if [ ! -f .env ]; then
  echo "Creating default .env from .env.example"
  cp .env.example .env
fi

echo "Setup complete. Use npm test to run security regression tests."
