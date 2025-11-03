const fs = require('fs');
const path = require('path');

/**
 * Security Audit Scanner
 * Analyzes Node.js code for common security vulnerabilities
 */

class SecurityAuditor {
  constructor() {
    this.vulnerabilities = [];
    this.severityLevels = {
      CRITICAL: 'critical',
      HIGH: 'high',
      MEDIUM: 'medium',
      LOW: 'low',
      INFO: 'info'
    };
  }

  /**
   * Scan a file for security vulnerabilities
   */
  scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileName = path.basename(filePath);
      
      console.log(`\nScanning: ${fileName}`);
      
      // Run all vulnerability checks
      this.checkSQLInjection(content, fileName);
      this.checkCommandInjection(content, fileName);
      this.checkHardcodedSecrets(content, fileName);
      this.checkPathTraversal(content, fileName);
      this.checkInsecureFileHandling(content, fileName);
      this.checkInputValidation(content, fileName);
      this.checkInformationDisclosure(content, fileName);
      this.checkInsecureDependencies(content, fileName);
      
      return this.vulnerabilities;
    } catch (error) {
      console.error(`Error scanning file: ${error.message}`);
      return [];
    }
  }

  /**
   * Check for SQL Injection vulnerabilities
   */
  checkSQLInjection(content, fileName) {
    // String concatenation in SQL queries
    const patterns = [
      {
        regex: /query\s*=\s*[`'"]\s*SELECT.*\$\{[^}]+\}/gi,
        message: 'SQL Injection: String interpolation in SQL query detected'
      },
      {
        regex: /query\s*=\s*[`'"].*['"]?\s*\+\s*(?:req\.|param|body|query)/gi,
        message: 'SQL Injection: String concatenation with user input in SQL query'
      },
      {
        regex: /SELECT\s+.*\s+FROM\s+.*\s+WHERE\s+.*['"]?\s*\+\s*/gi,
        message: 'SQL Injection: Dynamic SQL query construction detected'
      }
    ];

    patterns.forEach(pattern => {
      const matches = content.match(pattern.regex);
      if (matches) {
        matches.forEach(match => {
          this.addVulnerability({
            file: fileName,
            type: 'SQL Injection',
            severity: this.severityLevels.CRITICAL,
            description: pattern.message,
            code_snippet: match.substring(0, 100),
            owasp: 'A03:2021 – Injection',
            cwe: 'CWE-89: SQL Injection',
            recommendation: 'Use parameterized queries or prepared statements. Example: connection.query("SELECT * FROM users WHERE id = ?", [userId])',
            references: [
              'https://owasp.org/www-community/attacks/SQL_Injection',
              'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html'
            ]
          });
        });
      }
    });
  }

  /**
   * Check for Command Injection vulnerabilities
   */
  checkCommandInjection(content, fileName) {
    const patterns = [
      {
        regex: /exec\s*\(\s*[`'"].*\$\{[^}]+\}/gi,
        message: 'Command Injection: String interpolation in exec() detected'
      },
      {
        regex: /exec\s*\(\s*[`'"].*['"]?\s*\+\s*(?:req\.|param|body|query)/gi,
        message: 'Command Injection: String concatenation with user input in exec()'
      },
      {
        regex: /spawn\s*\(\s*[`'"].*\$\{[^}]+\}/gi,
        message: 'Command Injection: String interpolation in spawn() detected'
      }
    ];

    patterns.forEach(pattern => {
      const matches = content.match(pattern.regex);
      if (matches) {
        matches.forEach(match => {
          this.addVulnerability({
            file: fileName,
            type: 'Command Injection',
            severity: this.severityLevels.CRITICAL,
            description: pattern.message,
            code_snippet: match.substring(0, 100),
            owasp: 'A03:2021 – Injection',
            cwe: 'CWE-78: OS Command Injection',
            recommendation: 'Use execFile() with an array of arguments, or validate and sanitize all user inputs. Avoid shell interpretation.',
            references: [
              'https://owasp.org/www-community/attacks/Command_Injection',
              'https://nodejs.org/api/child_process.html#child_processexecfilefile-args-options-callback'
            ]
          });
        });
      }
    });
  }

  /**
   * Check for hardcoded secrets and credentials
   */
  checkHardcodedSecrets(content, fileName) {
    const patterns = [
      {
        regex: /password\s*[:=]\s*['"]((?!process\.env|config\.|CHANGE_ME)[^'"]{3,})['"]/gi,
        message: 'Hardcoded password detected',
        severity: this.severityLevels.CRITICAL
      },
      {
        regex: /api[_-]?key\s*[:=]\s*['"]((?!process\.env|config\.)[^'"]{10,})['"]/gi,
        message: 'Hardcoded API key detected',
        severity: this.severityLevels.CRITICAL
      },
      {
        regex: /secret\s*[:=]\s*['"]((?!process\.env|config\.|CHANGE_ME)[^'"]{10,})['"]/gi,
        message: 'Hardcoded secret detected',
        severity: this.severityLevels.HIGH
      },
      {
        regex: /token\s*[:=]\s*['"]((?!process\.env|config\.)[^'"]{20,})['"]/gi,
        message: 'Hardcoded token detected',
        severity: this.severityLevels.HIGH
      }
    ];

    patterns.forEach(pattern => {
      const matches = [...content.matchAll(new RegExp(pattern.regex.source, pattern.regex.flags))];
      matches.forEach(match => {
        this.addVulnerability({
          file: fileName,
          type: 'Hardcoded Secrets',
          severity: pattern.severity,
          description: pattern.message,
          code_snippet: match[0].substring(0, 80) + '...',
          owasp: 'A07:2021 – Identification and Authentication Failures',
          cwe: 'CWE-798: Use of Hard-coded Credentials',
          recommendation: 'Store secrets in environment variables or use a secure secrets management system. Use process.env.SECRET_NAME to access secrets.',
          references: [
            'https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password',
            'https://www.npmjs.com/package/dotenv'
          ]
        });
      });
    });
  }

  /**
   * Check for path traversal vulnerabilities
   */
  checkPathTraversal(content, fileName) {
    const patterns = [
      {
        regex: /path\.join\s*\([^)]*(?:req\.|params|query|body)[^)]*\)/gi,
        message: 'Path Traversal: Direct use of user input in path.join()'
      },
      {
        regex: /res\.download\s*\([^)]*(?:req\.|params|query|body)[^)]*\)/gi,
        message: 'Path Traversal: User input used directly in res.download()'
      },
      {
        regex: /fs\.(?:readFile|writeFile|unlink)\s*\([^)]*(?:req\.|params|query|body)[^)]*\)/gi,
        message: 'Path Traversal: User input used directly in file operations'
      }
    ];

    patterns.forEach(pattern => {
      const matches = content.match(pattern.regex);
      if (matches) {
        // Check if there's validation before the path operation
        const hasValidation = /(?:isValid|validate|sanitize|\.test\(|\.match\()/.test(content);
        const hasPathResolveCheck = /startsWith\s*\(/.test(content);
        
        if (!hasValidation || !hasPathResolveCheck) {
          matches.forEach(match => {
            this.addVulnerability({
              file: fileName,
              type: 'Path Traversal',
              severity: this.severityLevels.HIGH,
              description: pattern.message,
              code_snippet: match.substring(0, 100),
              owasp: 'A01:2021 – Broken Access Control',
              cwe: 'CWE-22: Path Traversal',
              recommendation: 'Validate and sanitize file paths. Use path.resolve() and check if the resolved path starts with the intended directory. Implement a whitelist of allowed files.',
              references: [
                'https://owasp.org/www-community/attacks/Path_Traversal',
                'https://nodejs.org/api/path.html#pathresolvepaths'
              ]
            });
          });
        }
      }
    });
  }

  /**
   * Check for insecure file handling
   */
  checkInsecureFileHandling(content, fileName) {
    const issues = [];
    
    // Check for missing file size limits
    if (content.includes('express.json()') && !content.includes('limit:')) {
      this.addVulnerability({
        file: fileName,
        type: 'Insecure File Handling',
        severity: this.severityLevels.MEDIUM,
        description: 'No request size limit set for JSON parser',
        code_snippet: 'express.json()',
        owasp: 'A04:2021 – Insecure Design',
        cwe: 'CWE-400: Uncontrolled Resource Consumption',
        recommendation: 'Set a size limit: express.json({ limit: "1mb" })',
        references: [
          'https://expressjs.com/en/api.html#express.json'
        ]
      });
    }

    // Check for unsafe file write operations
    if (/writeFileSync\s*\([^)]*\)/.test(content) && !content.includes('mode:')) {
      this.addVulnerability({
        file: fileName,
        type: 'Insecure File Handling',
        severity: this.severityLevels.LOW,
        description: 'File write operation without explicit permissions',
        code_snippet: 'writeFileSync without mode option',
        owasp: 'A04:2021 – Insecure Design',
        cwe: 'CWE-732: Incorrect Permission Assignment',
        recommendation: 'Specify file permissions: fs.writeFileSync(path, data, { mode: 0o644 })',
        references: [
          'https://nodejs.org/api/fs.html#fspromiseswritefilefile-data-options'
        ]
      });
    }
  }

  /**
   * Check for insufficient input validation
   */
  checkInputValidation(content, fileName) {
    // Check if user inputs are used without validation
    const userInputPatterns = [
      /req\.query\.[a-zA-Z_]+/g,
      /req\.body\.[a-zA-Z_]+/g,
      /req\.params\.[a-zA-Z_]+/g
    ];

    let hasInputs = false;
    userInputPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        hasInputs = true;
      }
    });

    if (hasInputs) {
      // Check for validation mechanisms
      const hasValidation = /(?:validator|joi|express-validator|\.test\(|isValid|validate|sanitize)/.test(content);
      
      if (!hasValidation) {
        this.addVulnerability({
          file: fileName,
          type: 'Insufficient Input Validation',
          severity: this.severityLevels.HIGH,
          description: 'User inputs used without validation',
          code_snippet: 'req.query/body/params used without validation',
          owasp: 'A03:2021 – Injection',
          cwe: 'CWE-20: Improper Input Validation',
          recommendation: 'Implement input validation using regex patterns, validator libraries, or schema validation (e.g., Joi, express-validator)',
          references: [
            'https://owasp.org/www-project-proactive-controls/v3/en/c5-validate-inputs',
            'https://www.npmjs.com/package/express-validator'
          ]
        });
      }
    }
  }

  /**
   * Check for information disclosure
   */
  checkInformationDisclosure(content, fileName) {
    const patterns = [
      {
        regex: /res\.(?:json|send)\s*\(\s*(?:process\.env|err|error)/gi,
        message: 'Information Disclosure: Sensitive data exposed in response'
      },
      {
        regex: /console\.log\s*\([^)]*(?:password|secret|token|key)[^)]*\)/gi,
        message: 'Information Disclosure: Sensitive data logged to console'
      }
    ];

    patterns.forEach(pattern => {
      const matches = content.match(pattern.regex);
      if (matches) {
        matches.forEach(match => {
          this.addVulnerability({
            file: fileName,
            type: 'Information Disclosure',
            severity: this.severityLevels.MEDIUM,
            description: pattern.message,
            code_snippet: match.substring(0, 100),
            owasp: 'A01:2021 – Broken Access Control',
            cwe: 'CWE-200: Exposure of Sensitive Information',
            recommendation: 'Avoid exposing sensitive information. Use generic error messages for users and log details server-side only.',
            references: [
              'https://owasp.org/www-community/Improper_Error_Handling'
            ]
          });
        });
      }
    });
  }

  /**
   * Check for insecure dependencies
   */
  checkInsecureDependencies(content, fileName) {
    if (fileName === 'package.json') {
      try {
        const pkg = JSON.parse(content);
        
        // Check for outdated or vulnerable packages
        const knownVulnerable = {
          'express': { version: '4.0.0', issue: 'Outdated version with known vulnerabilities' },
          'mysql': { version: '2.0.0', issue: 'Consider using mysql2 with better security features' }
        };

        Object.keys(knownVulnerable).forEach(pkgName => {
          if (pkg.dependencies && pkg.dependencies[pkgName]) {
            this.addVulnerability({
              file: fileName,
              type: 'Insecure Dependencies',
              severity: this.severityLevels.INFO,
              description: `Potentially insecure dependency: ${pkgName}`,
              code_snippet: `"${pkgName}": "${pkg.dependencies[pkgName]}"`,
              owasp: 'A06:2021 – Vulnerable and Outdated Components',
              cwe: 'CWE-1104: Use of Unmaintained Third Party Components',
              recommendation: 'Run npm audit and update dependencies. Consider using npm audit fix or Snyk for vulnerability scanning.',
              references: [
                'https://docs.npmjs.com/cli/v8/commands/npm-audit',
                'https://snyk.io/'
              ]
            });
          }
        });
      } catch (e) {
        // Not a valid JSON file
      }
    }
  }

  /**
   * Add a vulnerability to the list
   */
  addVulnerability(vuln) {
    this.vulnerabilities.push({
      id: `VULN-${this.vulnerabilities.length + 1}`,
      timestamp: new Date().toISOString(),
      ...vuln
    });
  }

  /**
   * Generate vulnerability report
   */
  generateReport() {
    const report = {
      scan_info: {
        timestamp: new Date().toISOString(),
        scanner: 'Node.js Security Auditor v1.0',
        total_vulnerabilities: this.vulnerabilities.length
      },
      summary: {
        critical: this.vulnerabilities.filter(v => v.severity === 'critical').length,
        high: this.vulnerabilities.filter(v => v.severity === 'high').length,
        medium: this.vulnerabilities.filter(v => v.severity === 'medium').length,
        low: this.vulnerabilities.filter(v => v.severity === 'low').length,
        info: this.vulnerabilities.filter(v => v.severity === 'info').length
      },
      vulnerabilities: this.vulnerabilities,
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  /**
   * Generate security recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const vulnTypes = [...new Set(this.vulnerabilities.map(v => v.type))];

    if (vulnTypes.includes('SQL Injection')) {
      recommendations.push({
        category: 'Database Security',
        priority: 'Critical',
        actions: [
          'Use parameterized queries for all database operations',
          'Implement ORM/query builder (e.g., Sequelize, TypeORM)',
          'Apply principle of least privilege for database accounts',
          'Enable database query logging and monitoring'
        ]
      });
    }

    if (vulnTypes.includes('Command Injection')) {
      recommendations.push({
        category: 'Command Execution Security',
        priority: 'Critical',
        actions: [
          'Use child_process.execFile() instead of exec()',
          'Validate and whitelist all command inputs',
          'Avoid shell interpretation of commands',
          'Implement strict input validation'
        ]
      });
    }

    if (vulnTypes.includes('Hardcoded Secrets')) {
      recommendations.push({
        category: 'Secrets Management',
        priority: 'Critical',
        actions: [
          'Move all secrets to environment variables',
          'Use a secrets management service (e.g., HashiCorp Vault, AWS Secrets Manager)',
          'Implement .env file with .gitignore',
          'Rotate all exposed credentials immediately'
        ]
      });
    }

    if (vulnTypes.includes('Path Traversal')) {
      recommendations.push({
        category: 'File Access Security',
        priority: 'High',
        actions: [
          'Validate and sanitize all file paths',
          'Use path.resolve() and verify paths stay within allowed directories',
          'Implement whitelist of allowed files/directories',
          'Set proper file system permissions'
        ]
      });
    }

    recommendations.push({
      category: 'General Security',
      priority: 'High',
      actions: [
        'Implement comprehensive input validation',
        'Add rate limiting to prevent abuse',
        'Enable security headers (helmet.js)',
        'Implement proper error handling',
        'Set up security monitoring and logging',
        'Regular security audits and penetration testing',
        'Keep all dependencies up to date',
        'Implement HTTPS/TLS in production'
      ]
    });

    return recommendations;
  }

  /**
   * Display report summary in console
   */
  displaySummary() {
    const report = this.generateReport();
    
    console.log('\n===========================================');
    console.log('Security Audit Report');
    console.log('===========================================\n');
    
    console.log(`Total Vulnerabilities: ${report.scan_info.total_vulnerabilities}`);
    console.log(`  Critical: ${report.summary.critical}`);
    console.log(`  High: ${report.summary.high}`);
    console.log(`  Medium: ${report.summary.medium}`);
    console.log(`  Low: ${report.summary.low}`);
    console.log(`  Info: ${report.summary.info}\n`);

    if (this.vulnerabilities.length > 0) {
      console.log('Vulnerabilities Found:\n');
      
      this.vulnerabilities.forEach(vuln => {
        const severityColor = {
          critical: '\x1b[31m',  // Red
          high: '\x1b[33m',       // Yellow
          medium: '\x1b[36m',     // Cyan
          low: '\x1b[32m',        // Green
          info: '\x1b[37m'        // White
        };
        
        const color = severityColor[vuln.severity] || '\x1b[0m';
        console.log(`${color}[${vuln.severity.toUpperCase()}]\x1b[0m ${vuln.type}`);
        console.log(`  File: ${vuln.file}`);
        console.log(`  ${vuln.description}`);
        console.log(`  OWASP: ${vuln.owasp}`);
        console.log(`  CWE: ${vuln.cwe}`);
        console.log(`  Fix: ${vuln.recommendation}\n`);
      });
    }

    console.log('===========================================\n');
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node security-audit.js <file-to-scan> [output-file]');
    console.log('Example: node security-audit.js vulnerable-app.js vulnerability-report.json');
    process.exit(1);
  }

  const filePath = args[0];
  const outputFile = args[1] || 'vulnerability-report.json';

  const auditor = new SecurityAuditor();
  auditor.scanFile(filePath);
  
  const report = auditor.generateReport();
  
  // Save report to file
  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
  console.log(`Report saved to ${outputFile}`);
  
  // Display summary
  auditor.displaySummary();
  
  // Exit with error code if vulnerabilities found
  process.exit(report.scan_info.total_vulnerabilities > 0 ? 1 : 0);
}

module.exports = SecurityAuditor;
