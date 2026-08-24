#!/bin/bash
set -e

echo "=== Running Full System Verification Tests ==="

echo "1. Running Backend Unit & Security Tests..."
cd backend && npm test

echo "2. Validating Frontend Production Build..."
cd ../frontend && npm run build

echo "=== All Tests and Builds Passed Successfully ==="
