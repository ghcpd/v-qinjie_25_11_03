Write-Host "Installing dependencies";
if (Test-Path package-lock.json) { npm ci } else { npm install };
Write-Host "Generating test data";
node scripts/generate_test_data.js;
Write-Host "Running report generation";
npm run report;
Write-Host "Running security tests";
npm test;
Write-Host "Done. Reports: vulnerability_report.json, test_results.json";
