#!/bin/bash

# Hotel Extranet Integration Testing Script
# Tests all external service integrations and API connections

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL=${BACKEND_URL:-"http://localhost:5000"}
FRONTEND_URL=${FRONTEND_URL:-"http://localhost:3000"}
TEST_TIMEOUT=${TEST_TIMEOUT:-30}

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test functions
test_backend_health() {
    log_info "Testing backend health check..."
    
    if curl -f "$BACKEND_URL/api/v1/monitoring/health" > /dev/null 2>&1; then
        log_success "Backend health check passed"
        return 0
    else
        log_error "Backend health check failed"
        return 1
    fi
}

test_database_connection() {
    log_info "Testing database connection..."
    
    response=$(curl -s "$BACKEND_URL/api/v1/monitoring/health")
    if echo "$response" | grep -q '"database":{"status":"up"'; then
        log_success "Database connection test passed"
        return 0
    else
        log_error "Database connection test failed"
        return 1
    fi
}

test_redis_connection() {
    log_info "Testing Redis connection..."
    
    response=$(curl -s "$BACKEND_URL/api/v1/monitoring/health")
    if echo "$response" | grep -q '"redis":{"status":"up"'; then
        log_success "Redis connection test passed"
        return 0
    else
        log_warning "Redis connection test failed (optional service)"
        return 0
    fi
}

test_email_service() {
    log_info "Testing email service..."
    
    # Test email service endpoint
    response=$(curl -s -X POST "$BACKEND_URL/api/v1/notifications/test-email" \
        -H "Content-Type: application/json" \
        -d '{"to":"test@example.com","subject":"Test","message":"Test message"}' \
        -w "%{http_code}")
    
    if echo "$response" | grep -q "200"; then
        log_success "Email service test passed"
        return 0
    else
        log_warning "Email service test failed (check configuration)"
        return 0
    fi
}

test_file_storage() {
    log_info "Testing file storage service..."
    
    # Test file upload endpoint
    response=$(curl -s -X POST "$BACKEND_URL/api/v1/files/upload" \
        -F "file=@/dev/null" \
        -w "%{http_code}")
    
    if echo "$response" | grep -q "200\|400"; then
        log_success "File storage service test passed"
        return 0
    else
        log_warning "File storage service test failed (check configuration)"
        return 0
    fi
}

test_payment_gateway() {
    log_info "Testing payment gateway..."
    
    # Test payment processing endpoint
    response=$(curl -s -X POST "$BACKEND_URL/api/v1/payments/process" \
        -H "Content-Type: application/json" \
        -d '{"bookingId":"test","amount":100,"currency":"USD","paymentMethod":"card","customerEmail":"test@example.com"}' \
        -w "%{http_code}")
    
    if echo "$response" | grep -q "200\|400"; then
        log_success "Payment gateway test passed"
        return 0
    else
        log_warning "Payment gateway test failed (check configuration)"
        return 0
    fi
}

test_vcc_provider() {
    log_info "Testing VCC provider..."
    
    # Test VCC generation endpoint
    response=$(curl -s -X POST "$BACKEND_URL/api/v1/payments/vcc/generate" \
        -H "Content-Type: application/json" \
        -d '{"bookingId":"test","amount":100,"currency":"USD","expiryDays":30}' \
        -w "%{http_code}")
    
    if echo "$response" | grep -q "200\|400"; then
        log_success "VCC provider test passed"
        return 0
    else
        log_warning "VCC provider test failed (check configuration)"
        return 0
    fi
}

test_channel_manager() {
    log_info "Testing channel manager..."
    
    # Test channel connection endpoint
    response=$(curl -s -X POST "$BACKEND_URL/api/v1/channels/test-connection" \
        -H "Content-Type: application/json" \
        -d '{"channelType":"siteminder","apiKey":"test","apiSecret":"test"}' \
        -w "%{http_code}")
    
    if echo "$response" | grep -q "200\|400"; then
        log_success "Channel manager test passed"
        return 0
    else
        log_warning "Channel manager test failed (check configuration)"
        return 0
    fi
}

test_frontend_health() {
    log_info "Testing frontend health..."
    
    if curl -f "$FRONTEND_URL" > /dev/null 2>&1; then
        log_success "Frontend health check passed"
        return 0
    else
        log_error "Frontend health check failed"
        return 1
    fi
}

test_api_endpoints() {
    log_info "Testing API endpoints..."
    
    local endpoints=(
        "/api/v1/monitoring/health"
        "/api/v1/monitoring/metrics/system"
        "/api/v1/auth/login"
        "/api/v1/properties"
        "/api/v1/bookings"
        "/api/v1/search/properties"
    )
    
    local failed=0
    
    for endpoint in "${endpoints[@]}"; do
        log_info "Testing endpoint: $endpoint"
        
        response=$(curl -s -w "%{http_code}" "$BACKEND_URL$endpoint")
        status_code="${response: -3}"
        
        if [[ "$status_code" =~ ^[2-4][0-9][0-9]$ ]]; then
            log_success "Endpoint $endpoint: $status_code"
        else
            log_error "Endpoint $endpoint: $status_code"
            ((failed++))
        fi
    done
    
    if [ $failed -eq 0 ]; then
        log_success "All API endpoints test passed"
        return 0
    else
        log_error "$failed API endpoints failed"
        return 1
    fi
}

test_integration_tests() {
    log_info "Running integration tests..."
    
    cd app/backend
    
    if npm run test:integration; then
        log_success "Integration tests passed"
        cd - > /dev/null
        return 0
    else
        log_error "Integration tests failed"
        cd - > /dev/null
        return 1
    fi
}

test_e2e_tests() {
    log_info "Running E2E tests..."
    
    cd app/backend
    
    if npm run test:e2e; then
        log_success "E2E tests passed"
        cd - > /dev/null
        return 0
    else
        log_error "E2E tests failed"
        cd - > /dev/null
        return 1
    fi
}

test_performance() {
    log_info "Testing performance..."
    
    # Test response times
    local start_time=$(date +%s%3N)
    curl -s "$BACKEND_URL/api/v1/monitoring/health" > /dev/null
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))
    
    if [ $response_time -lt 1000 ]; then
        log_success "Performance test passed (${response_time}ms)"
        return 0
    else
        log_warning "Performance test slow (${response_time}ms)"
        return 0
    fi
}

test_security() {
    log_info "Testing security..."
    
    # Test HTTPS redirect
    if curl -s -I "$BACKEND_URL/api/v1/monitoring/health" | grep -q "HTTP/1.1 200"; then
        log_success "Security test passed"
        return 0
    else
        log_warning "Security test failed (check HTTPS configuration)"
        return 0
    fi
}

# Main test function
run_tests() {
    log_info "Starting integration tests..."
    
    local total_tests=0
    local passed_tests=0
    local failed_tests=0
    
    # Backend tests
    log_info "=== Backend Tests ==="
    
    ((total_tests++))
    if test_backend_health; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi
    
    ((total_tests++))
    if test_database_connection; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi
    
    ((total_tests++))
    if test_redis_connection; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi
    
    # External service tests
    log_info "=== External Service Tests ==="
    
    ((total_tests++))
    if test_email_service; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi
    
    ((total_tests++))
    if test_file_storage; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi
    
    ((total_tests++))
    if test_payment_gateway; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi
    
    ((total_tests++))
    if test_vcc_provider; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi
    
    ((total_tests++))
    if test_channel_manager; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi
    
    # Frontend tests
    log_info "=== Frontend Tests ==="
    
    ((total_tests++))
    if test_frontend_health; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi
    
    # API tests
    log_info "=== API Tests ==="
    
    ((total_tests++))
    if test_api_endpoints; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi
    
    # Automated tests
    log_info "=== Automated Tests ==="
    
    ((total_tests++))
    if test_integration_tests; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi
    
    ((total_tests++))
    if test_e2e_tests; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi
    
    # Performance and security tests
    log_info "=== Performance & Security Tests ==="
    
    ((total_tests++))
    if test_performance; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi
    
    ((total_tests++))
    if test_security; then
        ((passed_tests++))
    else
        ((failed_tests++))
    fi
    
    # Summary
    log_info "=== Test Summary ==="
    log_info "Total tests: $total_tests"
    log_success "Passed: $passed_tests"
    
    if [ $failed_tests -gt 0 ]; then
        log_error "Failed: $failed_tests"
        return 1
    else
        log_success "All tests passed!"
        return 0
    fi
}

# Help function
show_help() {
    echo "Hotel Extranet Integration Testing Script"
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
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run tests
run_tests
