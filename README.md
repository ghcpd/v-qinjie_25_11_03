# Node.js Security Audit Sample

This repository contains an intentionally insecure Express application and a secure refactored variant used to demonstrate automated vulnerability detection, reporting, and regression testing.

## Features

* Insecure app: hardcoded DB secret, SQL injection via string concatenation.
* Secure app: environment-based config, parameterized queries, validation, security headers.
* Automated scripts to generate test payloads, run static heuristic analysis, and output machine-readable JSON reports.

## Quick Start

PowerShell (Windows):

```powershell
./run_security_test.ps1
```

Linux/macOS:

```bash
chmod +x run_security_test.sh
./run_security_test.sh
```

Outputs:

* `vulnerability_report.json` - Detected issues in insecure code.
* `test_results.json` - Findings verifying mitigations in secure version.

## Docker

Build and run (example; DB not provisioned here):

```bash
docker build -t node-security-audit .
docker run --rm -p 3000:3000 node-security-audit
```

## Extending

Add new detectors in `scripts/generate_report.js` and new runtime tests in `scripts/run_tests.js`.
