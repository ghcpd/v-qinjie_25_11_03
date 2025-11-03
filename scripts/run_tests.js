const fs = require('fs');
const path = require('path');
const supertest = require('supertest');

async function loadApp(kind) {
  return require(path.join('..', 'src', kind, 'app.js'));
}

function staticAnalysisInsecure() {
  const code = fs.readFileSync(path.join('src', 'insecure', 'app.js'), 'utf8');
  const issues = [];
  if (/password123/.test(code)) issues.push({ type: 'hardcoded-secret', severity: 'high', message: 'Hardcoded database password.' });
  if (/SELECT \* FROM users WHERE username = '\$?\{?username/.test(code) || /`SELECT \* FROM users WHERE username = '\$\{username\}'`/.test(code)) {
    issues.push({ type: 'sql-injection', severity: 'critical', message: 'Unsafely concatenated SQL query with user input.' });
  }
  if (!/helmet/.test(code)) {
    issues.push({ type: 'missing-security-headers', severity: 'medium', message: 'Helmet not enabled.' });
  }
  return issues;
}

function staticAnalysisSecure() {
  const code = fs.readFileSync(path.join('src', 'secure', 'app.js'), 'utf8');
  const findings = [];
  if (/execute\('SELECT \* FROM users WHERE username = \?', \[q.username\]\)/.test(code)) {
    findings.push({ type: 'parameterized-query', message: 'Parameterized query in use.' });
  }
  if (/helmet\(\)/.test(code)) {
    findings.push({ type: 'security-headers', message: 'Helmet middleware present.' });
  }
  if (/Ajv/.test(code)) {
    findings.push({ type: 'input-validation', message: 'Ajv validation implemented.' });
  }
  if (!/password123/.test(code)) {
    findings.push({ type: 'no-hardcoded-secret', message: 'No hardcoded password present.' });
  }
  return findings;
}

async function dynamicTests() {
  // NOTE: DB not connected in test environment; we only test HTTP validation logic for secure app.
  const secureApp = await loadApp('secure');
  const agent = supertest(secureApp);
  const invalidResp = await agent.get('/user?username=admin" OR "1"="1');
  const oversize = 'a'.repeat(60);
  const oversizeResp = await agent.get('/user?username=' + oversize);
  return {
    invalidStatus: invalidResp.status, // expect 400 due to pattern mismatch
    oversizeStatus: oversizeResp.status // expect 400 due to length > 50
  };
}

async function main() {
  const insecureIssues = staticAnalysisInsecure();
  const secureFindings = staticAnalysisSecure();
  const dynamic = await dynamicTests();

  const passDynamic = dynamic.invalidStatus === 400 && dynamic.oversizeStatus === 400;

  const report = {
    timestamp: new Date().toISOString(),
    static: { insecureIssues, secureFindings },
    dynamic,
    dynamicValidationPassed: passDynamic
  };
  fs.writeFileSync('test_results.json', JSON.stringify(report, null, 2));
  console.log('Security tests complete. Findings written to test_results.json');

  if (!passDynamic) {
    console.error('Dynamic validation tests failed');
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
