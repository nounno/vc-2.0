#!/bin/bash
#
# VC 2.0 Deploy Check Script
# This script validates the deployment configuration before deploying.
# All checks must pass for a successful deployment.
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠ WARN${NC}: $1"
    ((WARNINGS++))
}

info() {
    echo -e "${BLUE}ℹ INFO${NC}: $1"
}

section() {
    echo ""
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load environment variables
if [ -f .env ]; then
    info "Loading environment from .env"
    set -a
    source .env
    set +a
elif [ -f .env.example ]; then
    info "Loading environment from .env.example (no .env found)"
    set -a
    source .env.example
    set +a
else
    warn "No .env or .env.example found"
fi

section "VC 2.0 Deployment Checks"

# ==============================================================================
# Check 1: MySQL Configuration (Mandatory)
# ==============================================================================
section "1. MySQL Configuration (Mandatory)"

# Check MYSQL_HOST
if [ -z "${MYSQL_HOST}" ]; then
    fail "MYSQL_HOST is not set - MySQL host is mandatory"
else
    pass "MYSQL_HOST is set: ${MYSQL_HOST}"
fi

# Check MYSQL_PORT
if [ -z "${MYSQL_PORT}" ]; then
    fail "MYSQL_PORT is not set - MySQL port is mandatory"
else
    if [[ "${MYSQL_PORT}" =~ ^[0-9]+$ ]] && [ "${MYSQL_PORT}" -ge 1 ] && [ "${MYSQL_PORT}" -le 65535 ]; then
        pass "MYSQL_PORT is valid: ${MYSQL_PORT}"
    else
        fail "MYSQL_PORT is invalid: ${MYSQL_PORT} (must be 1-65535)"
    fi
fi

# Check MYSQL_USER
if [ -z "${MYSQL_USER}" ]; then
    fail "MYSQL_USER is not set - MySQL user is mandatory"
else
    pass "MYSQL_USER is set: ${MYSQL_USER}"
fi

# Check MYSQL_PASSWORD
if [ -z "${MYSQL_PASSWORD}" ] || [ "${MYSQL_PASSWORD}" = "***" ] || [ -z "${MYSQL_PASSWORD//\*/}" ]; then
    warn "MYSQL_PASSWORD is not set or masked - Using docker-compose secrets"
else
    pass "MYSQL_PASSWORD is set"
    # Check for URL-encoding issues with special characters
    if [[ "${MYSQL_PASSWORD}" =~ [@#%!$] ]]; then
        info "MYSQL_PASSWORD contains special characters that require URL encoding"
        # Verify the password doesn't contain unencoded special chars that would break URL
        if [[ "${MYSQL_PASSWORD}" =~ [@] ]] && [[ ! "${MYSQL_PASSWORD}" =~ %40 ]]; then
            warn "MYSQL_PASSWORD contains '@' which should be URL-encoded as '%40'"
        fi
        if [[ "${MYSQL_PASSWORD}" =~ [#] ]] && [[ ! "${MYSQL_PASSWORD}" =~ %23 ]]; then
            warn "MYSQL_PASSWORD contains '#' which should be URL-encoded as '%23'"
        fi
    fi
fi

# Check MYSQL_DATABASE
if [ -z "${MYSQL_DATABASE}" ]; then
    fail "MYSQL_DATABASE is not set - MySQL database is mandatory"
else
    pass "MYSQL_DATABASE is set: ${MYSQL_DATABASE}"
fi

# ==============================================================================
# Check 2: MySQL URL Encoding Validation
# ==============================================================================
section "2. MySQL URL Encoding Validation"

# Function to check URL encoding
check_url_encoding() {
    local password="$1"
    local encoded=$(python3 -c "from urllib.parse import quote_plus; print(quote_plus('$password'))" 2>/dev/null || echo "$password")
    
    if [ "$password" != "$encoded" ]; then
        info "Password '$password' should be URL-encoded as: $encoded"
        return 0
    fi
    return 1
}

# Check if MYSQL_PASSWORD needs URL encoding in connection string
if [ -n "${MYSQL_PASSWORD}" ]; then
    # Common problematic characters in MySQL passwords
    if [[ "${MYSQL_PASSWORD}" =~ [@] ]]; then
        warn "MYSQL_PASSWORD contains '@' - ensure connection string uses proper URL encoding"
    fi
    if [[ "${MYSQL_PASSWORD}" =~ [#] ]]; then
        warn "MYSQL_PASSWORD contains '#' - ensure connection string uses proper URL encoding (%23)"
    fi
    if [[ "${MYSQL_PASSWORD}" =~ [%] ]]; then
        warn "MYSQL_PASSWORD contains '%' - ensure this is properly escaped or encoded"
    fi
    pass "MySQL URL encoding check completed"
fi

# ==============================================================================
# Check 3: CORS Configuration
# ==============================================================================
section "3. CORS Configuration"

if [ -z "${ALLOWED_ORIGINS}" ]; then
    warn "ALLOWED_ORIGINS is not set - CORS may not work correctly"
else
    pass "ALLOWED_ORIGINS is set: ${ALLOWED_ORIGINS}"
    
    # Validate origin format
    IFS=',' read -ra ORIGINS <<< "${ALLOWED_ORIGINS}"
    for origin in "${ORIGINS[@]}"; do
        origin=$(echo "$origin" | xargs)  # Trim whitespace
        if [ "$origin" = "*" ]; then
            warn "ALLOWED_ORIGINS contains wildcard '*' - not recommended for production"
        elif [[ "$origin" =~ ^https?:// ]]; then
            pass "Origin format valid: $origin"
        else
            warn "Origin format may be invalid: $origin (expected http:// or https://)"
        fi
    done
fi

# ==============================================================================
# Check 4: Admin Paths Verification
# ==============================================================================
section "4. Admin Pages Verification"

ADMIN_APP_DIR="./apps/admin/app"

# Check accounts page
if [ -f "${ADMIN_APP_DIR}/accounts/page.tsx" ]; then
    pass "Admin accounts page exists: ${ADMIN_APP_DIR}/accounts/page.tsx"
else
    fail "Admin accounts page missing: ${ADMIN_APP_DIR}/accounts/page.tsx"
fi

# Check logs page
if [ -f "${ADMIN_APP_DIR}/logs/page.tsx" ]; then
    pass "Admin logs page exists: ${ADMIN_APP_DIR}/logs/page.tsx"
else
    fail "Admin logs page missing: ${ADMIN_APP_DIR}/logs/page.tsx"
fi

# Check pipeline page
if [ -f "${ADMIN_APP_DIR}/pipeline/page.tsx" ]; then
    pass "Admin pipeline page exists: ${ADMIN_APP_DIR}/pipeline/page.tsx"
else
    fail "Admin pipeline page missing: ${ADMIN_APP_DIR}/pipeline/page.tsx"
fi

# Verify pages use relative API paths
if [ -f "${ADMIN_APP_DIR}/accounts/page.tsx" ]; then
    if grep -q "/api/v1/" "${ADMIN_APP_DIR}/accounts/page.tsx"; then
        pass "accounts/page.tsx uses relative /api/v1/ paths"
    else
        fail "accounts/page.tsx should use relative /api/v1/ paths"
    fi
fi

if [ -f "${ADMIN_APP_DIR}/logs/page.tsx" ]; then
    if grep -q "/api/v1/" "${ADMIN_APP_DIR}/logs/page.tsx"; then
        pass "logs/page.tsx uses relative /api/v1/ paths"
    else
        fail "logs/page.tsx should use relative /api/v1/ paths"
    fi
fi

if [ -f "${ADMIN_APP_DIR}/pipeline/page.tsx" ]; then
    if grep -q "/api/v1/" "${ADMIN_APP_DIR}/pipeline/page.tsx"; then
        pass "pipeline/page.tsx uses relative /api/v1/ paths"
    else
        fail "pipeline/page.tsx should use relative /api/v1/ paths"
    fi
fi

# ==============================================================================
# Check 5: Nginx Security Headers
# ==============================================================================
section "5. Nginx Security Headers"

NGINX_CONF="./docker/conf.d/admin.conf"

if [ -f "$NGINX_CONF" ]; then
    pass "Nginx admin config exists: $NGINX_CONF"
    
    # Check for security headers
    HEADERS=(
        "X-Frame-Options"
        "X-Content-Type-Options"
        "X-XSS-Protection"
        "Referrer-Policy"
        "Content-Security-Policy"
        "Permissions-Policy"
    )
    
    for header in "${HEADERS[@]}"; do
        if grep -q "$header" "$NGINX_CONF"; then
            pass "Nginx config contains $header"
        else
            fail "Nginx config missing $header"
        fi
    done
    
    # Check for 'always' directive (nginx 1.7.5+)
    if grep -q "always;" "$NGINX_CONF" || grep -q "always" "$NGINX_CONF"; then
        pass "Nginx headers use 'always' directive"
    else
        warn "Nginx headers may not use 'always' directive"
    fi
else
    fail "Nginx admin config not found: $NGINX_CONF"
fi

# ==============================================================================
# Check 6: Test Files Verification
# ==============================================================================
section "6. Test Files Verification"

TESTS_DIR="./apps/api/tests"
TEST_FILES=(
    "test_health.py"
    "test_api.py"
    "test_admin_pages.py"
    "test_mysql_config.py"
    "test_cors.py"
    "test_nginx_headers.py"
)

# Count total test files
TOTAL_TESTS=0
for test_file in "${TEST_FILES[@]}"; do
    if [ -f "${TESTS_DIR}/${test_file}" ]; then
        pass "Test file exists: ${test_file}"
        # Count test functions in file
        TEST_COUNT=$(grep -c "def test_" "${TESTS_DIR}/${test_file}" 2>/dev/null || echo "0")
        TOTAL_TESTS=$((TOTAL_TESTS + TEST_COUNT))
        info "  Found $TEST_COUNT test functions in ${test_file}"
    else
        fail "Test file missing: ${test_file}"
    fi
done

info "Total test functions found: $TOTAL_TESTS"
if [ "$TOTAL_TESTS" -ge 20 ]; then
    pass "Test count requirement met: $TOTAL_TESTS >= 20"
else
    warn "Test count below recommended (20+): found $TOTAL_TESTS"
fi

# ==============================================================================
# Check 7: CI Workflow Verification
# ==============================================================================
section "7. CI Workflow Verification"

GITHUB_WORKFLOWS="./.github/workflows"
if [ -d "$GITHUB_WORKFLOWS" ]; then
    if [ -f "${GITHUB_WORKFLOWS}/ci.yml" ]; then
        pass "CI workflow exists: ci.yml"
        
        # Check for essential CI jobs
        if grep -q "lint-and-test-api" "${GITHUB_WORKFLOWS}/ci.yml"; then
            pass "CI workflow contains lint-and-test-api job"
        fi
        if grep -q "test-admin-build" "${GITHUB_WORKFLOWS}/ci.yml"; then
            pass "CI workflow contains test-admin-build job"
        fi
        if grep -q "deploy-check" "${GITHUB_WORKFLOWS}/ci.yml"; then
            pass "CI workflow contains deploy-check job"
        fi
    else
        fail "CI workflow missing: ci.yml"
    fi
else
    warn "GitHub workflows directory not found: $GITHUB_WORKFLOWS"
fi

# ==============================================================================
# Check 8: Documentation Verification
# ==============================================================================
section "8. Documentation Verification"

DOCS_FILE="./docs/audit-tracking.md"
if [ -f "$DOCS_FILE" ]; then
    pass "Audit tracking documentation exists: $DOCS_FILE"
    
    # Check for key sections
    SECTIONS=("Overview" "Test Coverage" "Audit Checklist" "Sign-off")
    for section in "${SECTIONS[@]}"; do
        if grep -q "$section" "$DOCS_FILE"; then
            pass "Documentation contains section: $section"
        else
            warn "Documentation may be missing section: $section"
        fi
    done
else
    fail "Audit tracking documentation missing: $DOCS_FILE"
fi

# ==============================================================================
# Summary
# ==============================================================================
section "Deployment Check Summary"

echo ""
echo -e "Results: ${GREEN}${PASSED} passed${NC}, ${RED}${FAILED} failed${NC}, ${YELLOW}${WARNINGS} warnings${NC}"
echo ""

if [ "$FAILED" -gt 0 ]; then
    echo -e "${RED}Deployment check FAILED - please fix the issues above${NC}"
    echo ""
    exit 1
elif [ "$WARNINGS" -gt 0 ]; then
    echo -e "${YELLOW}Deployment check completed with warnings - review recommended${NC}"
    echo ""
    exit 0
else
    echo -e "${GREEN}Deployment check PASSED - all required checks successful${NC}"
    echo ""
    exit 0
fi
