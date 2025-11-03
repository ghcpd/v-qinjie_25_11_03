const axios = require('axios');
const chalk = require('chalk');
const fs = require('fs');

class SecurityTester {
  constructor(baseURL, testDataFile) {
    this.baseURL = baseURL;
    this.testData = JSON.parse(fs.readFileSync(testDataFile, 'utf8'));
    this.results = {
      timestamp: new Date().toISOString(),
      baseURL: baseURL,
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        vulnerabilities_detected: 0
      },
      tests: []
    };
  }

  async runTest(test, category) {
    const testResult = {
      category: category,
      name: test.name,
      endpoint: test.endpoint,
      method: test.method,
      status: 'unknown',
      vulnerable: false,
      details: ''
    };

    try {
      let response;
      const url = `${this.baseURL}${test.endpoint}`;

      if (test.method === 'GET') {
        response = await axios.get(url, {
          params: test.params,
          validateStatus: () => true, // Accept any status code
          timeout: 5000
        });
      } else if (test.method === 'POST') {
        response = await axios.post(url, test.body, {
          validateStatus: () => true,
          timeout: 5000
        });
      }

      testResult.statusCode = response.status;
      testResult.responseSize = JSON.stringify(response.data).length;

      // Analyze response to detect vulnerabilities
      if (response.status === 200) {
        // Check for signs of successful exploitation
        const responseData = JSON.stringify(response.data).toLowerCase();
        
        // SQL Injection indicators
        if (category === 'SQL Injection') {
          if (responseData.includes('root@') || 
              responseData.includes('select') || 
              responseData.includes('union') ||
              Array.isArray(response.data) && response.data.length > 1) {
            testResult.vulnerable = true;
            testResult.status = 'VULNERABLE';
            testResult.details = 'SQL Injection successful - unauthorized data accessed';
          } else {
            testResult.vulnerable = false;
            testResult.status = 'SECURE';
            testResult.details = 'SQL Injection blocked';
          }
        }
        
        // Command Injection indicators
        else if (category === 'Command Injection') {
          if (responseData.includes('uid=') || 
              responseData.includes('root') ||
              responseData.includes('total ') ||
              responseData.includes('rwx')) {
            testResult.vulnerable = true;
            testResult.status = 'VULNERABLE';
            testResult.details = 'Command Injection successful - unauthorized command executed';
          } else {
            testResult.vulnerable = false;
            testResult.status = 'SECURE';
            testResult.details = 'Command Injection blocked';
          }
        }
        
        // Path Traversal indicators
        else if (category === 'Path Traversal') {
          if (responseData.includes('root:x:') || 
              responseData.includes('administrator') ||
              response.headers['content-disposition']) {
            testResult.vulnerable = true;
            testResult.status = 'VULNERABLE';
            testResult.details = 'Path Traversal successful - unauthorized file accessed';
          } else {
            testResult.vulnerable = false;
            testResult.status = 'SECURE';
            testResult.details = 'Path Traversal blocked';
          }
        }
        
        // Information Disclosure
        else if (category === 'Information Disclosure') {
          if (responseData.includes('password') || 
              responseData.includes('secret') ||
              responseData.includes('api_key') ||
              responseData.includes('db_')) {
            testResult.vulnerable = true;
            testResult.status = 'VULNERABLE';
            testResult.details = 'Sensitive information exposed';
          } else {
            testResult.vulnerable = false;
            testResult.status = 'SECURE';
            testResult.details = 'Information properly protected';
          }
        }
        
        else {
          testResult.status = 'COMPLETED';
          testResult.details = 'Test completed with 200 OK';
        }
      } else if (response.status === 400) {
        testResult.vulnerable = false;
        testResult.status = 'SECURE';
        testResult.details = 'Input validation working - malicious input rejected';
      } else if (response.status === 403) {
        testResult.vulnerable = false;
        testResult.status = 'SECURE';
        testResult.details = 'Access control working - request denied';
      } else if (response.status === 404) {
        testResult.vulnerable = false;
        testResult.status = 'SECURE';
        testResult.details = 'Endpoint not exposing sensitive info';
      } else if (response.status === 500) {
        testResult.vulnerable = true;
        testResult.status = 'VULNERABLE';
        testResult.details = 'Server error - potential vulnerability or information leak';
      }

      if (testResult.vulnerable) {
        this.results.summary.vulnerabilities_detected++;
      }

    } catch (error) {
      testResult.status = 'ERROR';
      testResult.details = error.message;
      
      // Timeout might indicate successful sleep command in blind SQL injection
      if (error.code === 'ECONNABORTED' && test.name.includes('Time-based')) {
        testResult.vulnerable = true;
        testResult.status = 'VULNERABLE';
        testResult.details = 'Time-based attack successful - response delayed';
        this.results.summary.vulnerabilities_detected++;
      }
    }

    return testResult;
  }

  async runAllTests() {
    console.log(chalk.blue.bold('\n=== Security Test Suite ===\n'));
    console.log(`Testing: ${this.baseURL}\n`);

    for (const scenario of this.testData.test_scenarios) {
      console.log(chalk.yellow.bold(`\n[${scenario.category}]`));
      console.log(chalk.gray(scenario.description));

      for (const test of scenario.tests) {
        this.results.summary.total++;
        const result = await this.runTest(test, scenario.category);
        this.results.tests.push(result);

        // Display result
        let statusIcon = '';
        let statusColor = chalk.white;
        
        if (result.status === 'VULNERABLE') {
          statusIcon = '✗';
          statusColor = chalk.red;
          this.results.summary.failed++;
        } else if (result.status === 'SECURE') {
          statusIcon = '✓';
          statusColor = chalk.green;
          this.results.summary.passed++;
        } else if (result.status === 'ERROR') {
          statusIcon = '⚠';
          statusColor = chalk.yellow;
        } else {
          statusIcon = '•';
          statusColor = chalk.blue;
          this.results.summary.passed++;
        }

        console.log(`  ${statusColor(statusIcon)} ${test.name}`);
        console.log(chalk.gray(`    ${result.details}`));
      }
    }

    // Test legitimate requests
    console.log(chalk.yellow.bold(`\n[Legitimate Requests]`));
    console.log(chalk.gray('Testing that valid requests still work'));

    for (const test of this.testData.legitimate_tests) {
      this.results.summary.total++;
      try {
        const url = `${this.baseURL}${test.endpoint}`;
        let response;

        if (test.method === 'GET') {
          response = await axios.get(url, {
            params: test.params,
            validateStatus: () => true,
            timeout: 5000
          });
        } else if (test.method === 'POST') {
          response = await axios.post(url, test.body, {
            validateStatus: () => true,
            timeout: 5000
          });
        }

        const testResult = {
          category: 'Legitimate Request',
          name: test.name,
          endpoint: test.endpoint,
          method: test.method,
          statusCode: response.status,
          status: response.status === 200 ? 'PASSED' : 'FAILED',
          details: `Expected: ${test.expected}, Got: ${response.status}`
        };

        this.results.tests.push(testResult);

        if (response.status === 200) {
          console.log(`  ${chalk.green('✓')} ${test.name}`);
          this.results.summary.passed++;
        } else {
          console.log(`  ${chalk.red('✗')} ${test.name} - Status: ${response.status}`);
          this.results.summary.failed++;
        }
      } catch (error) {
        const testResult = {
          category: 'Legitimate Request',
          name: test.name,
          endpoint: test.endpoint,
          method: test.method,
          status: 'ERROR',
          details: error.message
        };
        this.results.tests.push(testResult);
        console.log(`  ${chalk.yellow('⚠')} ${test.name} - ${error.message}`);
      }
    }

    this.displaySummary();
    return this.results;
  }

  displaySummary() {
    console.log(chalk.blue.bold('\n=== Test Summary ===\n'));
    console.log(`Total Tests: ${this.results.summary.total}`);
    console.log(chalk.green(`Passed: ${this.results.summary.passed}`));
    console.log(chalk.red(`Failed: ${this.results.summary.failed}`));
    console.log(chalk.red.bold(`Vulnerabilities Detected: ${this.results.summary.vulnerabilities_detected}`));
    
    const percentage = ((this.results.summary.passed / this.results.summary.total) * 100).toFixed(1);
    console.log(`\nPass Rate: ${percentage}%\n`);
  }

  saveResults(filename) {
    fs.writeFileSync(filename, JSON.stringify(this.results, null, 2));
    console.log(chalk.green(`Results saved to ${filename}\n`));
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node security-tests.js <base-url> [output-file]');
    console.log('Example: node security-tests.js http://localhost:3000 results.json');
    process.exit(1);
  }

  const baseURL = args[0];
  const outputFile = args[1] || 'test-results.json';
  const testDataFile = './test-data.json';

  const tester = new SecurityTester(baseURL, testDataFile);
  
  try {
    const results = await tester.runAllTests();
    tester.saveResults(outputFile);
    
    // Exit with error code if vulnerabilities found
    process.exit(results.summary.vulnerabilities_detected > 0 ? 1 : 0);
  } catch (error) {
    console.error(chalk.red('Fatal error:'), error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = SecurityTester;
