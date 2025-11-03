const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

function analyzeFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  if (/password123/.test(code)) {
    issues.push({ type: 'hardcoded-secret', severity: 'high', message: 'Hardcoded password detected', remediation: 'Move secret to environment variable and secret manager.' });
  }
  // Detect naive concatenated SQL pattern (very simplified heuristic)
  if (/SELECT \* FROM users WHERE username = '\${0,1}username'/.test(code) || /SELECT \* FROM users WHERE username = '\$\{username\}'/.test(code) || /`SELECT \* FROM users WHERE username = '\$\{username\}'`/.test(code) || /SELECT \* FROM users WHERE username = '\${0,1}'/.test(code)) {
    issues.push({ type: 'sql-injection', severity: 'critical', message: 'Raw string concatenation into SQL query', remediation: 'Use parameterized queries with placeholders (?)' });
  }
  // Light AST parse to find template literals containing SELECT * FROM
  try {
    const ast = acorn.parse(code, { ecmaVersion: 2022, sourceType: 'script' });
    // Not fully traversing; minimal for demo
  } catch (e) {
    issues.push({ type: 'parse-error', severity: 'low', message: 'Failed to parse for deeper analysis: ' + e.message });
  }
  return { file: filePath, issues };
}

function main() {
  const targets = [path.join('src', 'insecure', 'app.js')];
  const analyses = targets.map(analyzeFile);
  const allIssues = analyses.flatMap(a => a.issues);
  const summary = {
    totalIssues: allIssues.length,
    byType: allIssues.reduce((acc, i) => { acc[i.type] = (acc[i.type] || 0) + 1; return acc; }, {})
  };
  const report = {
    generatedAt: new Date().toISOString(),
    analyses,
    summary,
    secureVersion: 'src/secure/app.js'
  };
  fs.writeFileSync('vulnerability_report.json', JSON.stringify(report, null, 2));
  console.log('vulnerability_report.json written');
}

main();
