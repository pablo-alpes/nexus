#!/usr/bin/env bash
# Verify tests and optionally lint, build, Docker.
# Usage: ./scripts/verify-build-and-tests.sh [--lint] [--build] [--docker]

set -e
cd "$(dirname "$0")/.."

echo "=== Tests ==="
npm run test:ci

for arg in "$@"; do
  case "$arg" in
    --lint)
      echo "=== Lint ==="
      npm run lint
      ;;
    --build)
      echo "=== Build ==="
      npm run build
      ;;
    --docker)
      echo "=== Docker build ==="
      docker build -t nexus-cloud:verify .
      echo "Docker image built: nexus-cloud:verify"
      ;;
  esac
done

echo "=== All checks passed ==="
