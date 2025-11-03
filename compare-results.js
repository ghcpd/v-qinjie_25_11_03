const fs = require('fs');

/**
 * Compare security test results between vulnerable and secure versions
 */

function compareResults(vulnerableFile, secureFile, outputFile) {
  try {
    const vulnerableResults = JSON.parse(fs.readFileSync(vulnerableFile, 'utf8'));
    const secureResults = JSON.parse(fs.readFileSync(secureFile, 'utf8'));
    
    const comparison = {
      timestamp: new Date().toISOString(),
      comparison_type: 'Vulnerable vs Secure Application',
      vulnerable: {
        baseURL: vulnerableResults.baseURL,
        summary: vulnerableResults.summary
      },
      secure: {
        baseURL: secureResults.baseURL,
        summary: secureResults.summary
      },
      improvements: {
        vulnerabilities_fixed: vulnerableResults.summary.vulnerabilities_detected - secureResults.summary.vulnerabilities_detected,
        pass_rate_improvement: ((secureResults.summary.passed / secureResults.summary.total) * 100 - 
                                 (vulnerableResults.summary.passed / vulnerableResults.summary.total) * 100).toFixed(2) + '%'
      },
      detailed_comparison: []
    };
    
    // Compare each test
    vulnerableResults.tests.forEach((vulnTest, index) => {
      const secureTest = secureResults.tests[index];
      
      if (secureTest && vulnTest.name === secureTest.name) {
        comparison.detailed_comparison.push({
          test: vulnTest.name,
          category: vulnTest.category,
          vulnerable_status: vulnTest.status,
          secure_status: secureTest.status,
          improvement: vulnTest.vulnerable && !secureTest.vulnerable ? 'FIXED' : 
                      !vulnTest.vulnerable && !secureTest.vulnerable ? 'SECURE' : 'NO_CHANGE'
        });
      }
    });
    
    // Write comparison report
    fs.writeFileSync(outputFile, JSON.stringify(comparison, null, 2));
    
    // Display summary
    console.log('\n===========================================');
    console.log('Comparison Report');
    console.log('===========================================\n');
    console.log(`Vulnerable App: ${comparison.vulnerable.summary.vulnerabilities_detected} vulnerabilities detected`);
    console.log(`Secure App: ${comparison.secure.summary.vulnerabilities_detected} vulnerabilities detected`);
    console.log(`Vulnerabilities Fixed: ${comparison.improvements.vulnerabilities_fixed}`);
    console.log(`Pass Rate Improvement: ${comparison.improvements.pass_rate_improvement}\n`);
    console.log(`Report saved to ${outputFile}\n`);
    
  } catch (error) {
    console.error('Error comparing results:', error.message);
    process.exit(1);
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log('Usage: node compare-results.js <vulnerable-results.json> <secure-results.json> <output-file.json>');
    process.exit(1);
  }
  
  compareResults(args[0], args[1], args[2]);
}

module.exports = compareResults;
