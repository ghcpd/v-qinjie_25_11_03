# Security Review

## Identified Vulnerabilities (Insecure App)

1. Hardcoded Database Credentials
   - Risk: Credential leakage, reuse, inability to rotate safely.
   - Fix: Use environment variables + secret manager.

2. SQL Injection via String Concatenation
   - Risk: Data exfiltration, modification, destruction.
   - Fix: Parameterized queries with placeholders (`?`) using mysql2 prepared statements.

3. Missing Input Validation
   - Risk: Injection payloads, performance issues, potential DoS.
   - Fix: Enforce schema (Ajv) with length + pattern constraints.

4. Lack of Security Headers
   - Risk: Increased attack surface for XSS, clickjacking.
   - Fix: Add Helmet middleware.

## Secure Version Enhancements

| Control | Mechanism | OWASP Category |
|---------|-----------|----------------|
| Secrets Management | .env variables | A07:2021 Identification and Authentication Failures |
| SQL Injection Mitigation | Parameterized queries | A03:2021 Injection |
| Input Validation | Ajv schema | A05:2021 Security Misconfiguration / A04:2021 Insecure Design |
| Security Headers | Helmet | A05:2021 Security Misconfiguration |

## Testing Approach

- Static heuristic scanning for insecure patterns.
- Generated malicious payload dataset (`test_inputs.json`).
- Comparative detection of mitigations in secure version.

## Future Hardening Ideas

- Add centralized logging + correlation IDs.
- Implement rate limiting & request size limits.
- Integrate SAST (Semgrep) and dependency scanning (npm audit) into CI.
- Add unit tests asserting rejection of malicious inputs.
