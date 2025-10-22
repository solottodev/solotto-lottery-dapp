#!/bin/bash

# Smoke test script for production deployment
# Usage: ./scripts/smoke-test.sh [base-url]
# Example: ./scripts/smoke-test.sh https://api.solotto.live

set -e

# Default to production URL if not provided
BASE_URL=${1:-"https://api.solotto.live"}

echo "🧪 Running Smoke Tests for: $BASE_URL"
echo "================================================"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
  local name=$1
  local url=$2
  local expected_code=${3:-200}

  echo -n "Testing $name... "

  response=$(curl -s -o /dev/null -w "%{http_code}" "$url")

  if [ "$response" -eq "$expected_code" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $response)"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC} (HTTP $response, expected $expected_code)"
    ((FAILED++))
  fi
}

# Test 1: Health endpoint
test_endpoint "Health Check" "$BASE_URL/api/v1/health" 200

# Test 2: History rounds
test_endpoint "History Rounds" "$BASE_URL/api/v1/history/rounds?limit=1" 200

# Test 3: History stats
test_endpoint "History Stats" "$BASE_URL/api/v1/history/stats" 200

# Test 4: Transparency data
test_endpoint "Transparency Data" "$BASE_URL/api/v1/history/transparency" 200

# Test 5: Check database connection
echo -n "Testing Database Connection... "
health_response=$(curl -s "$BASE_URL/api/v1/health")
if echo "$health_response" | grep -q '"database":"healthy"'; then
  echo -e "${GREEN}✓ PASS${NC} (Database healthy)"
  ((PASSED++))
else
  echo -e "${RED}✗ FAIL${NC} (Database not healthy)"
  ((FAILED++))
fi

# Test 6: Check network configuration
echo -n "Testing Network Configuration... "
# Note: This requires a protected endpoint, skip if no auth
echo -e "${YELLOW}⊘ SKIP${NC} (Requires authentication)"

# Summary
echo ""
echo "================================================"
echo "📊 Test Results:"
echo "   Passed: $PASSED"
echo "   Failed: $FAILED"
echo "================================================"

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed. Check deployment.${NC}"
  exit 1
fi
