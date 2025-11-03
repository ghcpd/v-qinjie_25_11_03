#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}/.."

cd "${PROJECT_ROOT}"

echo "[+] Installing dependencies"
npm install

echo "[+] Running lint checks"
npm run lint --if-present || echo "[!] Lint script not configured, proceeding"

echo "[+] Executing automated security regression tests"
npm test
