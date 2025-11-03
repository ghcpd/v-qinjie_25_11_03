#!/bin/bash

###############################################################################
# Node.js Security Test Runner (Bash)
# This script runs the complete security test suite with one command
###############################################################################

set -e

echo "========================================="
echo "Node.js Security Test Suite"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VULNERABLE_PORT=3000
SECURE_PORT=3001
RESULTS_DIR="./results"

# Create results directory
mkdir -p "$RESULTS_DIR"

# Function to check if a service is running
check_service() {
    local port=$1
    local name=$2
    
    if curl -s "http://localhost:$port" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name is running on port $port"
        return 0
    else
        echo -e "${RED}✗${NC} $name is not running on port $port"
        return 1
    fi
}

# Function to wait for service
wait_for_service() {
    local port=$1
    local name=$2
    local max_attempts=30
    local attempt=0
    
    echo "Waiting for $name to start..."
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "http://localhost:$port" > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} $name is ready"
            return 0
        fi
        
        attempt=$((attempt + 1))
        sleep 1
    done
    
    echo -e "${RED}✗${NC} Timeout waiting for $name"
    return 1
}

# Parse command line arguments
MODE=${1:-"all"}

case $MODE in
    "vulnerable")
        echo -e "${BLUE}Running tests on VULNERABLE application${NC}"
        echo ""
        
        # Check if vulnerable app is running, start if not
        if ! check_service $VULNERABLE_PORT "Vulnerable App"; then
            echo "Starting vulnerable application..."
            node vulnerable-app.js > "$RESULTS_DIR/vulnerable-app.log" 2>&1 &
            VULNERABLE_PID=$!
            echo "Vulnerable app started (PID: $VULNERABLE_PID)"
            
            wait_for_service $VULNERABLE_PORT "Vulnerable App" || exit 1
        fi
        
        # Run security audit
        echo ""
        echo -e "${YELLOW}Running static security audit...${NC}"
        node security-audit.js vulnerable-app.js "$RESULTS_DIR/vulnerability-report.json" || true
        
        # Run dynamic security tests
        echo ""
        echo -e "${YELLOW}Running dynamic security tests...${NC}"
        node security-tests.js "http://localhost:$VULNERABLE_PORT" "$RESULTS_DIR/vulnerable-test-results.json" || true
        
        # Kill vulnerable app if we started it
        if [ ! -z "$VULNERABLE_PID" ]; then
            kill $VULNERABLE_PID 2>/dev/null || true
        fi
        ;;
        
    "secure")
        echo -e "${BLUE}Running tests on SECURE application${NC}"
        echo ""
        
        # Check if secure app is running, start if not
        if ! check_service $SECURE_PORT "Secure App"; then
            echo "Starting secure application..."
            PORT=$SECURE_PORT node secure-app.js > "$RESULTS_DIR/secure-app.log" 2>&1 &
            SECURE_PID=$!
            echo "Secure app started (PID: $SECURE_PID)"
            
            wait_for_service $SECURE_PORT "Secure App" || exit 1
        fi
        
        # Run security tests
        echo ""
        echo -e "${YELLOW}Running security tests on secure version...${NC}"
        node security-tests.js "http://localhost:$SECURE_PORT" "$RESULTS_DIR/secure-test-results.json" || true
        
        # Kill secure app if we started it
        if [ ! -z "$SECURE_PID" ]; then
            kill $SECURE_PID 2>/dev/null || true
        fi
        ;;
        
    "compare"|"all")
        echo -e "${BLUE}Running complete security comparison${NC}"
        echo ""
        
        # Start both applications
        echo "Starting vulnerable application..."
        node vulnerable-app.js > "$RESULTS_DIR/vulnerable-app.log" 2>&1 &
        VULNERABLE_PID=$!
        
        echo "Starting secure application..."
        PORT=$SECURE_PORT node secure-app.js > "$RESULTS_DIR/secure-app.log" 2>&1 &
        SECURE_PID=$!
        
        # Wait for both to start
        wait_for_service $VULNERABLE_PORT "Vulnerable App" || exit 1
        wait_for_service $SECURE_PORT "Secure App" || exit 1
        
        # Run static analysis
        echo ""
        echo -e "${YELLOW}Running static security audit on vulnerable code...${NC}"
        node security-audit.js vulnerable-app.js "$RESULTS_DIR/vulnerability-report.json" || true
        
        # Run tests on vulnerable version
        echo ""
        echo -e "${YELLOW}Testing VULNERABLE application...${NC}"
        node security-tests.js "http://localhost:$VULNERABLE_PORT" "$RESULTS_DIR/vulnerable-test-results.json" || true
        
        # Run tests on secure version
        echo ""
        echo -e "${YELLOW}Testing SECURE application...${NC}"
        node security-tests.js "http://localhost:$SECURE_PORT" "$RESULTS_DIR/secure-test-results.json" || true
        
        # Generate comparison report
        echo ""
        echo -e "${YELLOW}Generating comparison report...${NC}"
        node compare-results.js "$RESULTS_DIR/vulnerable-test-results.json" "$RESULTS_DIR/secure-test-results.json" "$RESULTS_DIR/comparison-report.json" 2>/dev/null || true
        
        # Cleanup
        kill $VULNERABLE_PID $SECURE_PID 2>/dev/null || true
        
        # Display summary
        echo ""
        echo -e "${BLUE}=========================================${NC}"
        echo -e "${BLUE}Test Summary${NC}"
        echo -e "${BLUE}=========================================${NC}"
        echo ""
        echo "Results saved in: $RESULTS_DIR/"
        echo ""
        echo "Files generated:"
        echo "  - vulnerability-report.json (Static analysis)"
        echo "  - vulnerable-test-results.json (Dynamic tests on vulnerable app)"
        echo "  - secure-test-results.json (Dynamic tests on secure app)"
        echo "  - comparison-report.json (Comparison of results)"
        echo ""
        ;;
        
    "docker")
        echo -e "${BLUE}Running tests in Docker environment${NC}"
        echo ""
        
        # Check if Docker is available
        if ! command -v docker &> /dev/null; then
            echo -e "${RED}Error: Docker is not installed${NC}"
            exit 1
        fi
        
        # Start services
        echo "Starting Docker containers..."
        docker-compose up -d
        
        # Wait for services
        sleep 10
        
        # Run tests inside container
        echo ""
        echo -e "${YELLOW}Running security tests...${NC}"
        docker-compose exec -T test-runner node security-tests.js http://vulnerable-app:3000 results/vulnerable-docker-results.json || true
        docker-compose exec -T test-runner node security-tests.js http://secure-app:3000 results/secure-docker-results.json || true
        
        # Copy results
        docker cp test-runner:/app/results ./results/
        
        echo ""
        echo -e "${GREEN}Tests completed. Results saved in ./results/${NC}"
        echo ""
        echo "To stop containers: docker-compose down"
        ;;
        
    "clean")
        echo "Cleaning up..."
        
        # Kill any running Node processes for our apps
        pkill -f "node.*vulnerable-app.js" || true
        pkill -f "node.*secure-app.js" || true
        
        # Stop Docker containers
        docker-compose down 2>/dev/null || true
        
        echo -e "${GREEN}Cleanup complete${NC}"
        ;;
        
    *)
        echo "Usage: $0 {vulnerable|secure|compare|all|docker|clean}"
        echo ""
        echo "Modes:"
        echo "  vulnerable  - Test only the vulnerable application"
        echo "  secure      - Test only the secure application"
        echo "  compare|all - Test both and generate comparison report"
        echo "  docker      - Run tests in Docker environment"
        echo "  clean       - Stop all services and clean up"
        echo ""
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Security testing complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
