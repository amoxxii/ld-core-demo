#!/bin/bash

# LaunchDarkly Code References Update Script
# Updates code references in LaunchDarkly for this repo.

if [ -z "$LD_API_KEY" ]; then
  echo "⚠️  LD_API_KEY environment variable is not set. Skipping code references update."
  echo "   Set LD_API_KEY to enable automatic code references updates."
  exit 0
fi

if ! command -v ld-find-code-refs &> /dev/null; then
  echo "⚠️  ld-find-code-refs is not installed. Install it with:"
  echo "   npm install -g @launchdarkly/ld-find-code-refs"
  exit 0
fi

echo "🔄 Updating LaunchDarkly code references..."

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

ld-find-code-refs \
  --accessToken "$LD_API_KEY" \
  --projKey nteixeira-ld-demo \
  --repoName policy-agent-node \
  --repoType custom \
  "$PROJECT_DIR"

echo "✅ Code references update complete!"
