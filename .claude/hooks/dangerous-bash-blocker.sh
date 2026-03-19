#!/bin/bash
# dangerous-bash-blocker.sh
# Blocks dangerous bash commands before execution

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

DANGEROUS_PATTERNS=(
  "rm -rf"
  "rm -fr"
  "git push --force"
  "git push -f"
  "git clean -fdx"
  "git reset --hard HEAD~"
  "chmod 777"
  "DROP TABLE"
  "DROP DATABASE"
  "> /dev/"
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -q "$pattern"; then
    echo "Blocked: Command contains dangerous pattern '$pattern'" >&2
    echo "Reason: This command could cause data loss or security issues" >&2
    exit 2
  fi
done

exit 0
