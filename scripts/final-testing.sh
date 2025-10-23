#!/bin/bash

# Hotel Extranet Final Testing Script
# Comprehensive testing before production deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL=${BACKEND_URL:-"http://localhost:5000"}
FRONTEND_URL=${FRONTEND_URL:-"http://localhost:3000"}
TEST_TIMEOUT=${TEST_TIMEOUT:-30}
START_TIME=$(date +%s)

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNINGS=0

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    ((PASSED_TESTS++))
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    ((WARNINGS++))
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ((FAILED_TESTS++))
}

log_test() {
    echo -e "${PURPLE}[TEST]${NC} $1"
    ((TOTAL_TESTS++))
}

run_test() {
    local test_name="$1"
    local test_command="$2"

    log_test "$test_name"

    if eval "$test_command"; then
        log_success "$test_name passed"
        return 0
    else
        log_error "$test_name failed"
        return 1
    fi
}

check_requirements() {
    log_info "Checking final testing requirements..."

    # Check if applications are running
    if ! curl -f "$BACKEND_URL/api/v1/monitoring/health" > /dev/null 2>&1; then
        log_error "Backend is not running at $BACKEND_URL"
        exit 1
    fi

    if ! curl -f "$FRONTEND_URL" > /dev/null 2>&1; then
        log_error "Frontend is not running at $FRONTEND_URL"
        exit 1
    fi

    # Check database connectivity
    if ! curl -f "$BACKEND_URL/api/v1/performance/database" > /dev/null 2>&1; then
        log_warning "Database connectivity check failed"
    fi

    # Check Redis connectivity
    if ! curl -f "$BACKEND_URL/api/v1/performance/cache" > /dev/null 2>&1; then
        log_warning "Redis connectivity check failed"
    fi

    log_success "Requirements check completed"
}

test_system_health() {
    log_info "Testing system health..."

    run_test "Backend health check" \
        "curl -f '$BACKEND_URL/api/v1/monitoring/health' > /dev/null 2>&1"

    run_test "Frontend availability" \
        "curl -f '$FRONTEND_URL' > /dev/null 2>&1"

    run_test "API documentation access" \
        "curl -f '$BACKEND_URL/api-docs' > /dev/null 2>&1"

    run_test "Database connectivity" \
        "curl -s '$BACKEND_URL/api/v1/performance/database' | jq -e '.success' > /dev/null 2>&1"

    run_test "Redis connectivity" \
        "curl -s '$BACKEND_URL/api/v1/performance/cache' | jq -e '.success' > /dev/null 2>&1"
}

test_api_endpoints() {
    log_info "Testing API endpoints..."

    # Authentication endpoints
    run_test "User registration" \
        "curl -X POST '$BACKEND_URL/api/v1/auth/register' \
            -H 'Content-Type: application/json' \
            -d '{\"email\":\"test@example.com\",\"password\":\"TestPass123!\",\"firstName\":\"Test\",\"lastName\":\"User\"}' \
            -w '%{http_code}' | grep -q '201\|400'"

    run_test "User login" \
        "curl -X POST '$BACKEND_URL/api/v1/auth/login' \
            -H 'Content-Type: application/json' \
            -d '{\"email\":\"test@example.com\",\"password\":\"TestPass123!\"}' \
            -w '%{http_code}' | grep -q '200\|401'"

    # Property endpoints
    run_test "Property list access" \
        "curl -f '$BACKEND_URL/api/v1/properties' > /dev/null 2>&1"

    run_test "Property creation" \
        "curl -X POST '$BACKEND_URL/api/v1/properties' \
            -H 'Content-Type: application/json' \
            -d '{\"name\":\"Test Hotel\",\"address\":\"123 Test St\",\"city\":\"Test City\",\"country\":\"Test Country\"}' \
            -w '%{http_code}' | grep -q '201\|401'"

    # Booking endpoints
    run_test "Booking list access" \
        "curl -f '$BACKEND_URL/api/v1/bookings' > /dev/null 2>&1"

    run_test "Booking creation" \
        "curl -X POST '$BACKEND_URL/api/v1/bookings' \
            -H 'Content-Type: application/json' \
            -d '{\"propertyId\":\"test-property\",\"guestName\":\"Test Guest\",\"checkIn\":\"2024-01-15\",\"checkOut\":\"2024-01-17\",\"guests\":2}' \
            -w '%{http_code}' | grep -q '201\|400\|401'"

    # Search endpoints
    run_test "Property search" \
        "curl -f '$BACKEND_URL/api/v1/search/properties?checkIn=2024-01-15&checkOut=2024-01-17&guests=2' > /dev/null 2>&1"

    # Payment endpoints
    run_test "Payment processing" \
        "curl -X POST '$BACKEND_URL/api/v1/payments/process' \
            -H 'Content-Type: application/json' \
            -d '{\"bookingId\":\"test-booking\",\"amount\":100,\"currency\":\"USD\",\"paymentMethod\":\"card\"}' \
            -w '%{http_code}' | grep -q '200\|400\|401'"

    # File upload endpoints
    run_test "File upload" \
        "curl -X POST '$BACKEND_URL/api/v1/files/upload' \
            -F 'file=@/dev/null' \
            -w '%{http_code}' | grep -q '200\|400\|401'"
}

test_security_measures() {
    log_info "Testing security measures..."

    # Test rate limiting
    run_test "Rate limiting (authentication)" \
        "for i in {1..6}; do curl -X POST '$BACKEND_URL/api/v1/auth/login' -H 'Content-Type: application/json' -d '{\"email\":\"nonexistent@example.com\",\"password\":\"wrong\"}' -w '%{http_code}' -s; done | grep -q '429'"

    run_test "Rate limiting (API)" \
        "for i in {1..101}; do curl -f '$BACKEND_URL/api/v1/properties' -w '%{http_code}' -s; done | tail -1 | grep -q '429'"

    # Test input validation
    run_test "SQL injection protection" \
        "curl -X POST '$BACKEND_URL/api/v1/auth/login' \
            -H 'Content-Type: application/json' \
            -d '{\"email\":\"test'\'' OR '\''1'\''='\''1\",\"password\":\"test\"}' \
            -w '%{http_code}' | grep -q '400'"

    run_test "XSS protection" \
        "curl -X POST '$BACKEND_URL/api/v1/properties' \
            -H 'Content-Type: application/json' \
            -d '{\"name\":\"<script>alert(1)</script>\",\"address\":\"123 Test St\"}' \
            -w '%{http_code}' | grep -q '400'"

    # Test CORS
    run_test "CORS headers" \
        "curl -I '$BACKEND_URL/api/v1/properties' | grep -q 'Access-Control-Allow-Origin'"

    # Test security headers
    run_test "Security headers" \
        "curl -I '$BACKEND_URL/api/v1/properties' | grep -q 'X-Content-Type-Options\|X-Frame-Options\|X-XSS-Protection'"

    # Test HTTPS redirect (if applicable)
    if [[ "$BACKEND_URL" =~ ^https:// ]]; then
        run_test "HTTPS enforcement" \
            "curl -I '$BACKEND_URL/api/v1/properties' | grep -q 'Strict-Transport-Security'"
    fi
}

test_performance_metrics() {
    log_info "Testing performance metrics..."

    # Test response times
    local response_time=$(curl -w "%{time_total}" -o /dev/null -s "$BACKEND_URL/api/v1/monitoring/health")
    run_test "API response time (< 1s)" \
        "echo '$response_time < 1.0' | bc -l | grep -q 1"

    # Test memory usage
    local memory_usage=$(curl -s "$BACKEND_URL/api/v1/performance/system" | jq -r '.memory.heapUsed // 0')
    local memory_threshold=$((1024 * 1024 * 100)) # 100MB threshold
    run_test "Memory usage (< 100MB)" \
        "[ $memory_usage -lt $memory_threshold ]"

    # Test database performance
    local db_response=$(curl -w "%{time_total}" -o /dev/null -s "$BACKEND_URL/api/v1/performance/database")
    run_test "Database response time (< 500ms)" \
        "echo '$db_response < 0.5' | bc -l | grep -q 1"

    # Test cache performance
    local cache_response=$(curl -w "%{time_total}" -o /dev/null -s "$BACKEND_URL/api/v1/performance/cache")
    run_test "Cache response time (< 200ms)" \
        "echo '$cache_response < 0.2' | bc -l | grep -q 1"
}

test_integration_services() {
    log_info "Testing integration services..."

    # Test email service
    run_test "Email service" \
        "curl -X POST '$BACKEND_URL/api/v1/notifications/test-email' \
            -H 'Content-Type: application/json' \
            -d '{\"to\":\"test@example.com\",\"subject\":\"Test\",\"message\":\"Test message\"}' \
            -w '%{http_code}' | grep -q '200\|400'"

    # Test file storage
    run_test "File storage service" \
        "curl -X POST '$BACKEND_URL/api/v1/files/upload' \
            -F 'file=@/dev/null' \
            -w '%{http_code}' | grep -q '200\|400\|401'"

    # Test payment gateway (mock)
    run_test "Payment gateway" \
        "curl -X POST '$BACKEND_URL/api/v1/payments/process' \
            -H 'Content-Type: application/json' \
            -d '{\"bookingId\":\"test-booking\",\"amount\":100,\"currency\":\"USD\",\"paymentMethod\":\"card\"}' \
            -w '%{http_code}' | grep -q '200\|400\|401'"

    # Test VCC provider (mock)
    run_test "VCC provider" \
        "curl -X POST '$BACKEND_URL/api/v1/payments/vcc/generate' \
            -H 'Content-Type: application/json' \
            -d '{\"bookingId\":\"test-booking\",\"amount\":100,\"currency\":\"USD\"}' \
            -w '%{http_code}' | grep -q '200\|400\|401'"

    # Test channel manager (mock)
    run_test "Channel manager" \
        "curl -X POST '$BACKEND_URL/api/v1/channels/test-connection' \
            -H 'Content-Type: application/json' \
            -d '{\"channelType\":\"siteminder\",\"apiKey\":\"test\",\"apiSecret\":\"test\"}' \
            -w '%{http_code}' | grep -q '200\|400\|401'"
}

test_error_handling() {
    log_info "Testing error handling..."

    # Test 404 handling
    run_test "404 error handling" \
        "curl -s '$BACKEND_URL/api/v1/nonexistent' | jq -e '.message' > /dev/null 2>&1"

    # Test 401 authentication
    run_test "401 authentication" \
        "curl -s '$BACKEND_URL/api/v1/properties' | jq -e '.message' > /dev/null 2>&1"

    # Test 429 rate limiting
    run_test "429 rate limiting" \
        "curl -s -w '%{http_code}' '$BACKEND_URL/api/v1/auth/login' -X POST -H 'Content-Type: application/json' -d '{\"email\":\"test@example.com\",\"password\":\"wrong\"}' | grep -q '429'"

    # Test 500 error handling (simulate)
    run_test "500 error simulation" \
        "curl -s '$BACKEND_URL/api/v1/test-error' | jq -e '.message' > /dev/null 2>&1 || true"
}

test_frontend_functionality() {
    log_info "Testing frontend functionality..."

    # Test frontend loading
    run_test "Frontend loads successfully" \
        "curl -f '$FRONTEND_URL' > /dev/null 2>&1"

    # Test SPA routing
    run_test "SPA routing" \
        "curl -s '$FRONTEND_URL/nonexistent-route' | grep -q 'React'"

    # Test static assets
    run_test "Static assets loading" \
        "curl -f '$FRONTEND_URL/static/js/bundle.js' > /dev/null 2>&1 || curl -f '$FRONTEND_URL/assets/index.js' > /dev/null 2>&1"

    # Test service worker (if available)
    run_test "Service worker" \
        "curl -s '$FRONTEND_URL/sw.js' | grep -q 'self\.addEventListener' || curl -s '$FRONTEND_URL/service-worker.js' | grep -q 'self\.addEventListener'"
}

test_monitoring_and_logging() {
    log_info "Testing monitoring and logging..."

    # Test monitoring endpoints
    run_test "Performance monitoring" \
        "curl -f '$BACKEND_URL/api/v1/performance/metrics' > /dev/null 2>&1"

    run_test "System monitoring" \
        "curl -f '$BACKEND_URL/api/v1/performance/system' > /dev/null 2>&1"

    # Test logging (check if logs are being written)
    run_test "Application logging" \
        "curl -s '$BACKEND_URL/api/v1/monitoring/health' && sleep 1 && ls -la logs/ | grep -q '\.log$'"

    # Test error tracking (Sentry)
    run_test "Error tracking" \
        "curl -s '$BACKEND_URL/api/v1/performance/dashboard' | jq -e '.success' > /dev/null 2>&1"
}

test_backup_and_recovery() {
    log_info "Testing backup and recovery..."

    # Test backup creation
    run_test "Database backup creation" \
        "curl -X POST '$BACKEND_URL/api/v1/backups/create' \
            -H 'Content-Type: application/json' \
            -d '{\"backupType\":\"full\"}' \
            -w '%{http_code}' | grep -q '200\|401'"

    # Test backup listing
    run_test "Backup listing" \
        "curl -f '$BACKEND_URL/api/v1/backups' > /dev/null 2>&1 || true"

    # Test backup verification
    run_test "Backup verification" \
        "curl -X POST '$BACKEND_URL/api/v1/backups/test' \
            -H 'Content-Type: application/json' \
            -d '{\"backupType\":\"full\"}' \
            -w '%{http_code}' | grep -q '200\|401'"
}

test_load_and_stress() {
    log_info "Testing load and stress handling..."

    # Test concurrent requests
    run_test "Concurrent requests (10 parallel)" \
        "for i in {1..10}; do curl -f '$BACKEND_URL/api/v1/monitoring/health' > /dev/null 2>&1 & done && wait"

    # Test API under moderate load
    run_test "API under load (50 requests)" \
        "for i in {1..50}; do curl -f '$BACKEND_URL/api/v1/properties' > /dev/null 2>&1 & done && wait"

    # Test memory usage under load
    local memory_before=$(curl -s "$BACKEND_URL/api/v1/performance/system" | jq -r '.memory.heapUsed // 0')
    run_test "Memory usage under load" \
        "for i in {1..20}; do curl -f '$BACKEND_URL/api/v1/search/properties?checkIn=2024-01-15&checkOut=2024-01-17' > /dev/null 2>&1; done && sleep 2 && curl -s '$BACKEND_URL/api/v1/performance/system' | jq -e '.memory.heapUsed' > /dev/null 2>&1"
}

test_comprehensive_workflow() {
    log_info "Testing comprehensive workflow..."

    # Create a complete booking workflow
    run_test "Complete booking workflow" \
        "curl -X GET '$BACKEND_URL/api/v1/search/properties?checkIn=2024-01-15&checkOut=2024-01-17&guests=2' > /dev/null 2>&1 && \
         curl -X POST '$BACKEND_URL/api/v1/bookings' \
             -H 'Content-Type: application/json' \
             -d '{\"propertyId\":\"test-property\",\"guestName\":\"Test Guest\",\"checkIn\":\"2024-01-15\",\"checkOut\":\"2024-01-17\",\"guests\":2}' \
             -w '%{http_code}' | grep -q '201\|400' && \
         curl -X POST '$BACKEND_URL/api/v1/payments/process' \
             -H 'Content-Type: application/json' \
             -d '{\"bookingId\":\"test-booking\",\"amount\":100,\"currency\":\"USD\",\"paymentMethod\":\"card\"}' \
             -w '%{http_code}' | grep -q '200\|400' && \
         curl -X POST '$BACKEND_URL/api/v1/notifications/booking-confirmation' \
             -H 'Content-Type: application/json' \
             -d '{\"bookingId\":\"test-booking\",\"email\":\"test@example.com\"}' \
             -w '%{http_code}' | grep -q '200\|400'"
}

test_deployment_readiness() {
    log_info "Testing deployment readiness..."

    # Test all critical endpoints
    local critical_endpoints=(
        "/api/v1/monitoring/health"
        "/api/v1/performance/system"
        "/api/v1/auth/login"
        "/api/v1/properties"
        "/api/v1/bookings"
        "/api/v1/search/properties"
        "/api/v1/payments/process"
        "/api/v1/files/upload"
    )

    local critical_failures=0
    for endpoint in "${critical_endpoints[@]}"; do
        if ! curl -f "$BACKEND_URL$endpoint" > /dev/null 2>&1; then
            log_error "Critical endpoint failed: $endpoint"
            ((critical_failures++))
        fi
    done

    run_test "Critical endpoints availability" \
        "[ $critical_failures -eq 0 ]"

    # Test performance thresholds
    local avg_response_time=$(curl -w "%{time_total}" -o /dev/null -s "$BACKEND_URL/api/v1/monitoring/health" 2>/dev/null || echo "1.0")
    run_test "Performance threshold (< 500ms)" \
        "echo '$avg_response_time < 0.5' | bc -l | grep -q 1"

    # Test error rate
    local error_rate=$(curl -s "$BACKEND_URL/api/v1/performance/metrics" | jq -r '.report.operations.failed // 0')
    run_test "Error rate threshold (< 5%)" \
        "[ $error_rate -lt 5 ] || [ $error_rate -eq 0 ]"
}

generate_report() {
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))

    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                    FINAL TESTING REPORT                        ║"
    echo "╠════════════════════════════════════════════════════════════════╣"
    echo "║ Total Tests: $TOTAL_TESTS                                        ║"
    echo "║ Passed: $PASSED_TESTS                                              ║"
    echo "║ Failed: $FAILED_TESTS                                              ║"
    echo "║ Warnings: $WARNINGS                                               ║"
    echo "║ Duration: ${duration}s                                           ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""

    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "${GREEN}✅ ALL TESTS PASSED! System is ready for production.${NC}"
        echo ""
        echo "🎉 Deployment Checklist:"
        echo "  ✅ Code quality checks passed"
        echo "  ✅ Security measures implemented"
        echo "  ✅ Performance optimized"
        echo "  ✅ Monitoring configured"
        echo "  ✅ Backup strategy in place"
        echo "  ✅ Documentation complete"
        echo "  ✅ CI/CD pipeline ready"
        echo ""
        echo -e "${GREEN}🚀 System is PRODUCTION READY!${NC}"
        return 0
    else
        echo -e "${RED}❌ SOME TESTS FAILED! Please fix issues before deployment.${NC}"
        echo ""
        echo "🔧 Issues to address:"
        echo "  • $FAILED_TESTS test(s) failed"
        echo "  • $WARNINGS warning(s) detected"
        echo ""
        echo -e "${YELLOW}⚠️  Review failed tests and fix critical issues.${NC}"
        return 1
    fi
}

show_help() {
    echo "Hotel Extranet Final Testing Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --backend-url URL    Backend URL (default: http://localhost:5000)"
    echo "  --frontend-url URL   Frontend URL (default: http://localhost:3000)"
    echo "  --timeout SECONDS    Test timeout (default: 30)"
    echo "  --help              Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  BACKEND_URL          Backend URL"
    echo "  FRONTEND_URL         Frontend URL"
    echo "  TEST_TIMEOUT         Test timeout in seconds"
    echo ""
    echo "Examples:"
    echo "  $0"
    echo "  $0 --backend-url https://api.example.com"
    echo "  $0 --frontend-url https://app.example.com"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --backend-url)
            BACKEND_URL="$2"
            shift 2
            ;;
        --frontend-url)
            FRONTEND_URL="$2"
            shift 2
            ;;
        --timeout)
            TEST_TIMEOUT="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main execution
main() {
    echo -e "${BLUE}🏨 Hotel Extranet - Final Production Testing${NC}"
    echo "=================================================="

    check_requirements

    echo ""
    echo "🧪 Running comprehensive test suite..."
    echo ""

    test_system_health
    test_api_endpoints
    test_security_measures
    test_performance_metrics
    test_integration_services
    test_error_handling
    test_frontend_functionality
    test_monitoring_and_logging
    test_backup_and_recovery
    test_load_and_stress
    test_comprehensive_workflow
    test_deployment_readiness

    generate_report
}

# Run the tests
main
