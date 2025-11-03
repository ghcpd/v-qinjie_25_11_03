#!/usr/bin/env bash
set -euo pipefail
echo "Installing dependencies"
if [ -f package-lock.json ]; then npm ci; else npm install; fi
echo "Generating test data"
node scripts/generate_test_data.js
echo "Generating vulnerability report"
npm run report
echo "Running security tests"
npm test
echo "Done. See vulnerability_report.json and test_results.json"
