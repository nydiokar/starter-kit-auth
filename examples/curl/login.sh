#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4000}"
JAR="${JAR:-/tmp/auth-cookies.jar}"

email=${1:-user@example.com}
password=${2:-Str0ngP@ssw0rd!}

curl -i -c "$JAR" -b "$JAR" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$email\",\"password\":\"$password\"}" \
  "$BASE_URL/auth/login"

echo "Cookie jar: $JAR"

