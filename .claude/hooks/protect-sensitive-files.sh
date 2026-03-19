#!/bin/bash
# protect-sensitive-files.sh
# Blocks edits to sensitive files and source data

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

PROTECTED_PATTERNS=(
  ".env"
  ".env.local"
  "*.pem"
  "*.key"
  "*credentials*"
  "package-lock.json"
  ".git/"
  "node_modules/"
  ".next/"
  "dist/"
  "build/"
  "out/"
  ".claude/jobs/"
  "data/flipstarters-with-addresses.json"
  "data/flipstarters-new.json"
  "data/flipstarters-old-85.json"
  "data/flipstarters-from-api.json"
  "data/failed-campaigns-recipients.json"
)

for pattern in "${PROTECTED_PATTERNS[@]}"; do
  if [[ "$FILE_PATH" == *"$pattern"* ]]; then
    echo "Blocked: $FILE_PATH matches protected pattern '$pattern'" >&2
    echo "Reason: This file should not be edited directly" >&2
    exit 2
  fi
done

exit 0
