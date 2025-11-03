# Secure Node.js User Lookup Service

This repository contains a hardened Express sample inspired by the insecure snippet provided in `input.json`. The code demonstrates common remediation techniques against SQL injection and related web-application threats.

## Key Enhancements

- ✅ Parameterized SQL queries implemented with `mysql2/promise`
- ✅ Environment-driven secret management (`.env` template provided)
- ✅ Input validation and rate limiting for the `/user` endpoint
- ✅ Automated Jest + Supertest security regression tests
- ✅ Reproducible Docker image and one-click `scripts/run_security_test.sh`

## Quick Start

1. Copy `.env.example` to `.env` and update database credentials.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run automated security tests:
   ```bash
   npm test
   ```
4. Start the server:
   ```bash
   npm start
   ```

## One-Click Validation

Execute the helper script to install dependencies, lint, and run security tests:

```bash
./scripts/run_security_test.sh
```

> On Windows, run the script inside WSL or execute the individual npm commands.

## Docker Usage

Build the production image:

```bash
 docker build -t secure-node-app .
```

Run tests in the containerized test stage:

```bash
 docker build --target test -t secure-node-app-test .
 docker run --rm secure-node-app-test
```

## Test Data

Structured malicious payloads for regression testing are stored in `data/malicious_inputs.json`.

## Security Report

Detailed findings and remediation notes are published in `docs/security_report.json` after running the audit workflow.
