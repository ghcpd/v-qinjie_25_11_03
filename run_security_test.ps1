###############################################################################
# Node.js Security Test Runner (PowerShell)
# This script runs the complete security test suite with one command
###############################################################################

param(
    [Parameter(Position=0)]
    [ValidateSet('vulnerable', 'secure', 'compare', 'all', 'docker', 'clean')]
    [string]$Mode = 'all'
)

# Configuration
$VulnerablePort = 3000
$SecurePort = 3001
$ResultsDir = ".\results"

# Create results directory
New-Item -ItemType Directory -Force -Path $ResultsDir | Out-Null

# Function to check if a service is running
function Test-Service {
    param(
        [int]$Port,
        [string]$Name
    )
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$Port" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        Write-Host "[OK] $Name is running on port $Port" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "[ERROR] $Name is not running on port $Port" -ForegroundColor Red
        return $false
    }
}

# Function to wait for service
function Wait-ForService {
    param(
        [int]$Port,
        [string]$Name,
        [int]$MaxAttempts = 30
    )
    
    Write-Host "Waiting for $Name to start..." -ForegroundColor Yellow
    
    for ($i = 0; $i -lt $MaxAttempts; $i++) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$Port" -TimeoutSec 1 -UseBasicParsing -ErrorAction Stop
            Write-Host "[OK] $Name is ready" -ForegroundColor Green
            return $true
        } catch {
            Start-Sleep -Seconds 1
        }
    }
    
    Write-Host "[ERROR] Timeout waiting for $Name" -ForegroundColor Red
    return $false
}

# Function to stop process by port
function Stop-ProcessByPort {
    param([int]$Port)
    
    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "Stopping process $($process.Name) (PID: $($process.Id))" -ForegroundColor Yellow
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Node.js Security Test Suite" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

switch ($Mode) {
    'vulnerable' {
        Write-Host "Running tests on VULNERABLE application" -ForegroundColor Blue
        Write-Host ""
        
        # Check if vulnerable app is running, start if not
        if (-not (Test-Service -Port $VulnerablePort -Name "Vulnerable App")) {
            Write-Host "Starting vulnerable application..." -ForegroundColor Yellow
            
            $vulnProcess = Start-Process -FilePath "node" -ArgumentList "vulnerable-app.js" `
                -RedirectStandardOutput "$ResultsDir\vulnerable-app.log" `
                -RedirectStandardError "$ResultsDir\vulnerable-app-error.log" `
                -PassThru -NoNewWindow
            
            Write-Host "Vulnerable app started (PID: $($vulnProcess.Id))" -ForegroundColor Green
            
            if (-not (Wait-ForService -Port $VulnerablePort -Name "Vulnerable App")) {
                exit 1
            }
        }
        
        # Run security audit
        Write-Host ""
        Write-Host "Running static security audit..." -ForegroundColor Yellow
        node security-audit.js vulnerable-app.js "$ResultsDir\vulnerability-report.json"
        
        # Run dynamic security tests
        Write-Host ""
        Write-Host "Running dynamic security tests..." -ForegroundColor Yellow
        node security-tests.js "http://localhost:$VulnerablePort" "$ResultsDir\vulnerable-test-results.json"
        
        # Kill vulnerable app if we started it
        if ($vulnProcess) {
            Stop-Process -Id $vulnProcess.Id -Force -ErrorAction SilentlyContinue
        }
    }
    
    'secure' {
        Write-Host "Running tests on SECURE application" -ForegroundColor Blue
        Write-Host ""
        
        # Check if secure app is running, start if not
        if (-not (Test-Service -Port $SecurePort -Name "Secure App")) {
            Write-Host "Starting secure application..." -ForegroundColor Yellow
            
            $env:PORT = $SecurePort
            $secureProcess = Start-Process -FilePath "node" -ArgumentList "secure-app.js" `
                -RedirectStandardOutput "$ResultsDir\secure-app.log" `
                -RedirectStandardError "$ResultsDir\secure-app-error.log" `
                -PassThru -NoNewWindow
            
            Write-Host "Secure app started (PID: $($secureProcess.Id))" -ForegroundColor Green
            
            if (-not (Wait-ForService -Port $SecurePort -Name "Secure App")) {
                exit 1
            }
        }
        
        # Run security tests
        Write-Host ""
        Write-Host "Running security tests on secure version..." -ForegroundColor Yellow
        node security-tests.js "http://localhost:$SecurePort" "$ResultsDir\secure-test-results.json"
        
        # Kill secure app if we started it
        if ($secureProcess) {
            Stop-Process -Id $secureProcess.Id -Force -ErrorAction SilentlyContinue
        }
    }
    
    { $_ -in 'compare', 'all' } {
        Write-Host "Running complete security comparison" -ForegroundColor Blue
        Write-Host ""
        
        # Start vulnerable application
        Write-Host "Starting vulnerable application..." -ForegroundColor Yellow
        $vulnProcess = Start-Process -FilePath "node" -ArgumentList "vulnerable-app.js" `
            -RedirectStandardOutput "$ResultsDir\vulnerable-app.log" `
            -RedirectStandardError "$ResultsDir\vulnerable-app-error.log" `
            -PassThru -NoNewWindow
        
        # Start secure application
        Write-Host "Starting secure application..." -ForegroundColor Yellow
        $env:PORT = $SecurePort
        $secureProcess = Start-Process -FilePath "node" -ArgumentList "secure-app.js" `
            -RedirectStandardOutput "$ResultsDir\secure-app.log" `
            -RedirectStandardError "$ResultsDir\secure-app-error.log" `
            -PassThru -NoNewWindow
        
        # Wait for both to start
        if (-not (Wait-ForService -Port $VulnerablePort -Name "Vulnerable App")) {
            Stop-Process -Id $vulnProcess.Id -Force -ErrorAction SilentlyContinue
            Stop-Process -Id $secureProcess.Id -Force -ErrorAction SilentlyContinue
            exit 1
        }
        
        if (-not (Wait-ForService -Port $SecurePort -Name "Secure App")) {
            Stop-Process -Id $vulnProcess.Id -Force -ErrorAction SilentlyContinue
            Stop-Process -Id $secureProcess.Id -Force -ErrorAction SilentlyContinue
            exit 1
        }
        
        # Run static analysis
        Write-Host ""
        Write-Host "Running static security audit on vulnerable code..." -ForegroundColor Yellow
        node security-audit.js vulnerable-app.js "$ResultsDir\vulnerability-report.json"
        
        # Run tests on vulnerable version
        Write-Host ""
        Write-Host "Testing VULNERABLE application..." -ForegroundColor Yellow
        node security-tests.js "http://localhost:$VulnerablePort" "$ResultsDir\vulnerable-test-results.json"
        
        # Run tests on secure version
        Write-Host ""
        Write-Host "Testing SECURE application..." -ForegroundColor Yellow
        node security-tests.js "http://localhost:$SecurePort" "$ResultsDir\secure-test-results.json"
        
        # Generate comparison report
        Write-Host ""
        Write-Host "Generating comparison report..." -ForegroundColor Yellow
        node compare-results.js "$ResultsDir\vulnerable-test-results.json" "$ResultsDir\secure-test-results.json" "$ResultsDir\comparison-report.json" 2>$null
        
        # Cleanup
        Write-Host ""
        Write-Host "Stopping applications..." -ForegroundColor Yellow
        Stop-Process -Id $vulnProcess.Id -Force -ErrorAction SilentlyContinue
        Stop-Process -Id $secureProcess.Id -Force -ErrorAction SilentlyContinue
        
        # Display summary
        Write-Host ""
        Write-Host "=========================================" -ForegroundColor Cyan
        Write-Host "Test Summary" -ForegroundColor Cyan
        Write-Host "=========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Results saved in: $ResultsDir\" -ForegroundColor Green
        Write-Host ""
        Write-Host "Files generated:" -ForegroundColor White
        Write-Host "  - vulnerability-report.json (Static analysis)" -ForegroundColor Gray
        Write-Host "  - vulnerable-test-results.json (Dynamic tests on vulnerable app)" -ForegroundColor Gray
        Write-Host "  - secure-test-results.json (Dynamic tests on secure app)" -ForegroundColor Gray
        Write-Host "  - comparison-report.json (Comparison of results)" -ForegroundColor Gray
        Write-Host ""
    }
    
    'docker' {
        Write-Host "Running tests in Docker environment" -ForegroundColor Blue
        Write-Host ""
        
        # Check if Docker is available
        if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
            Write-Host "Error: Docker is not installed" -ForegroundColor Red
            exit 1
        }
        
        # Start services
        Write-Host "Starting Docker containers..." -ForegroundColor Yellow
        docker-compose up -d
        
        # Wait for services
        Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
        
        # Run tests inside container
        Write-Host ""
        Write-Host "Running security tests..." -ForegroundColor Yellow
        docker-compose exec -T test-runner node security-tests.js http://vulnerable-app:3000 results/vulnerable-docker-results.json
        docker-compose exec -T test-runner node security-tests.js http://secure-app:3000 results/secure-docker-results.json
        
        # Copy results
        docker cp test-runner:/app/results $ResultsDir
        
        Write-Host ""
        Write-Host "Tests completed. Results saved in .\results\" -ForegroundColor Green
        Write-Host ""
        Write-Host "To stop containers: docker-compose down" -ForegroundColor Yellow
    }
    
    'clean' {
        Write-Host "Cleaning up..." -ForegroundColor Yellow
        
        # Stop processes on known ports
        Stop-ProcessByPort -Port $VulnerablePort
        Stop-ProcessByPort -Port $SecurePort
        
        # Stop Docker containers
        if (Get-Command docker -ErrorAction SilentlyContinue) {
            docker-compose down 2>$null
        }
        
        Write-Host "Cleanup complete" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Security testing complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
