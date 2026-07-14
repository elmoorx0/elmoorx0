#!/bin/bash
# Elmoorx npm Publish Script
# Publishes all 77 packages to npm registry
#
# Usage:
#   ./scripts/npm-publish.sh --dry-run   # Test without publishing
#   ./scripts/npm-publish.sh             # Actually publish

set -e
echo "🚀 Publishing 78 Elmoorx packages to npm..."
echo ""

DRY_RUN=""
if [ "$1" = "--dry-run" ]; then
  DRY_RUN="--dry-run"
  echo "⚠️  DRY RUN MODE — no packages will actually be published"
  echo ""
fi

cd "$(dirname "$0")/.."

PUBLISHED=0
FAILED=0


# @elmoorx/a11y
echo "📦 Publishing @elmoorx/a11y..."
cd "packages/a11y"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/a11y"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/a11y failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/adapters
echo "📦 Publishing @elmoorx/adapters..."
cd "packages/adapters"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/adapters"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/adapters failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/ai-chat
echo "📦 Publishing @elmoorx/ai-chat..."
cd "packages/ai-chat"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/ai-chat"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/ai-chat failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/ai-copilot
echo "📦 Publishing @elmoorx/ai-copilot..."
cd "packages/ai-copilot"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/ai-copilot"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/ai-copilot failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/ai-dev
echo "📦 Publishing @elmoorx/ai-dev..."
cd "packages/ai-dev"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/ai-dev"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/ai-dev failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/analytics
echo "📦 Publishing @elmoorx/analytics..."
cd "packages/analytics"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/analytics"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/analytics failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/analyzer
echo "📦 Publishing @elmoorx/analyzer..."
cd "packages/analyzer"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/analyzer"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/analyzer failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/ar
echo "📦 Publishing @elmoorx/ar..."
cd "packages/ar"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/ar"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/ar failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/ar-vr
echo "📦 Publishing @elmoorx/ar-vr..."
cd "packages/ar-vr"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/ar-vr"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/ar-vr failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/auth
echo "📦 Publishing @elmoorx/auth..."
cd "packages/auth"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/auth"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/auth failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/auto-test
echo "📦 Publishing @elmoorx/auto-test..."
cd "packages/auto-test"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/auto-test"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/auto-test failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/blockchain
echo "📦 Publishing @elmoorx/blockchain..."
cd "packages/blockchain"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/blockchain"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/blockchain failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/cache
echo "📦 Publishing @elmoorx/cache..."
cd "packages/cache"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/cache"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/cache failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/cli
echo "📦 Publishing @elmoorx/cli..."
cd "packages/cli"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/cli"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/cli failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/cli-pro
echo "📦 Publishing @elmoorx/cli-pro..."
cd "packages/cli-pro"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/cli-pro"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/cli-pro failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/code-review
echo "📦 Publishing @elmoorx/code-review..."
cd "packages/code-review"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/code-review"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/code-review failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/collab
echo "📦 Publishing @elmoorx/collab..."
cd "packages/collab"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/collab"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/collab failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/compiler
echo "📦 Publishing @elmoorx/compiler..."
cd "packages/compiler"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/compiler"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/compiler failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/cron
echo "📦 Publishing @elmoorx/cron..."
cd "packages/cron"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/cron"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/cron failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/crypto
echo "📦 Publishing @elmoorx/crypto..."
cd "packages/crypto"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/crypto"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/crypto failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/css
echo "📦 Publishing @elmoorx/css..."
cd "packages/css"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/css"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/css failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/devtools
echo "📦 Publishing @elmoorx/devtools..."
cd "packages/devtools"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/devtools"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/devtools failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/edge-cache
echo "📦 Publishing @elmoorx/edge-cache..."
cd "packages/edge-cache"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/edge-cache"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/edge-cache failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/edge-db
echo "📦 Publishing @elmoorx/edge-db..."
cd "packages/edge-db"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/edge-db"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/edge-db failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/edge-functions
echo "📦 Publishing @elmoorx/edge-functions..."
cd "packages/edge-functions"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/edge-functions"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/edge-functions failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/email
echo "📦 Publishing @elmoorx/email..."
cd "packages/email"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/email"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/email failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/eslint-plugin
echo "📦 Publishing @elmoorx/eslint-plugin..."
cd "packages/eslint-plugin"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/eslint-plugin"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/eslint-plugin failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/experiments
echo "📦 Publishing @elmoorx/experiments..."
cd "packages/experiments"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/experiments"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/experiments failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/feature-flags
echo "📦 Publishing @elmoorx/feature-flags..."
cd "packages/feature-flags"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/feature-flags"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/feature-flags failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/forms
echo "📦 Publishing @elmoorx/forms..."
cd "packages/forms"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/forms"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/forms failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/gesture
echo "📦 Publishing @elmoorx/gesture..."
cd "packages/gesture"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/gesture"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/gesture failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/graphql
echo "📦 Publishing @elmoorx/graphql..."
cd "packages/graphql"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/graphql"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/graphql failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/head
echo "📦 Publishing @elmoorx/head..."
cd "packages/head"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/head"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/head failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/health
echo "📦 Publishing @elmoorx/health..."
cd "packages/health"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/health"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/health failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/i18n
echo "📦 Publishing @elmoorx/i18n..."
cd "packages/i18n"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/i18n"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/i18n failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/image
echo "📦 Publishing @elmoorx/image..."
cd "packages/image"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/image"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/image failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/logger
echo "📦 Publishing @elmoorx/logger..."
cd "packages/logger"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/logger"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/logger failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/marketplace
echo "📦 Publishing @elmoorx/marketplace..."
cd "packages/marketplace"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/marketplace"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/marketplace failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/migration
echo "📦 Publishing @elmoorx/migration..."
cd "packages/migration"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/migration"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/migration failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/monitoring
echo "📦 Publishing @elmoorx/monitoring..."
cd "packages/monitoring"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/monitoring"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/monitoring failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/native
echo "📦 Publishing @elmoorx/native..."
cd "packages/native"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/native"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/native failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/notifications
echo "📦 Publishing @elmoorx/notifications..."
cd "packages/notifications"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/notifications"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/notifications failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/observability
echo "📦 Publishing @elmoorx/observability..."
cd "packages/observability"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/observability"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/observability failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/payment
echo "📦 Publishing @elmoorx/payment..."
cd "packages/payment"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/payment"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/payment failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/perf-ai
echo "📦 Publishing @elmoorx/perf-ai..."
cd "packages/perf-ai"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/perf-ai"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/perf-ai failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/plugin-system
echo "📦 Publishing @elmoorx/plugin-system..."
cd "packages/plugin-system"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/plugin-system"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/plugin-system failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/postgres
echo "📦 Publishing @elmoorx/postgres..."
cd "packages/postgres"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/postgres"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/postgres failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/pubsub
echo "📦 Publishing @elmoorx/pubsub..."
cd "packages/pubsub"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/pubsub"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/pubsub failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/push
echo "📦 Publishing @elmoorx/push..."
cd "packages/push"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/push"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/push failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/queue
echo "📦 Publishing @elmoorx/queue..."
cd "packages/queue"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/queue"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/queue failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/realtime
echo "📦 Publishing @elmoorx/realtime..."
cd "packages/realtime"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/realtime"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/realtime failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/router
echo "📦 Publishing @elmoorx/router..."
cd "packages/router"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/router"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/router failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/runtime
echo "📦 Publishing @elmoorx/runtime..."
cd "packages/runtime"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/runtime"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/runtime failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/scheduler
echo "📦 Publishing @elmoorx/scheduler..."
cd "packages/scheduler"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/scheduler"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/scheduler failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/search
echo "📦 Publishing @elmoorx/search..."
cd "packages/search"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/search"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/search failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/secrets
echo "📦 Publishing @elmoorx/secrets..."
cd "packages/secrets"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/secrets"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/secrets failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/security-pro
echo "📦 Publishing @elmoorx/security-pro..."
cd "packages/security-pro"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/security-pro"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/security-pro failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/server
echo "📦 Publishing @elmoorx/server..."
cd "packages/server"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/server"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/server failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/state-utils
echo "📦 Publishing @elmoorx/state-utils..."
cd "packages/state-utils"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/state-utils"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/state-utils failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/storage
echo "📦 Publishing @elmoorx/storage..."
cd "packages/storage"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/storage"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/storage failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/store-pro
echo "📦 Publishing @elmoorx/store-pro..."
cd "packages/store-pro"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/store-pro"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/store-pro failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/telemetry
echo "📦 Publishing @elmoorx/telemetry..."
cd "packages/telemetry"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/telemetry"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/telemetry failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/templates
echo "📦 Publishing @elmoorx/templates..."
cd "packages/templates"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/templates"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/templates failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/testing
echo "📦 Publishing @elmoorx/testing..."
cd "packages/testing"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/testing"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/testing failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/testing-pro
echo "📦 Publishing @elmoorx/testing-pro..."
cd "packages/testing-pro"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/testing-pro"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/testing-pro failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/theme-studio
echo "📦 Publishing @elmoorx/theme-studio..."
cd "packages/theme-studio"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/theme-studio"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/theme-studio failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/time-travel
echo "📦 Publishing @elmoorx/time-travel..."
cd "packages/time-travel"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/time-travel"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/time-travel failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/ui
echo "📦 Publishing @elmoorx/ui..."
cd "packages/ui"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/ui"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/ui failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/validation
echo "📦 Publishing @elmoorx/validation..."
cd "packages/validation"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/validation"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/validation failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/virtual
echo "📦 Publishing @elmoorx/virtual..."
cd "packages/virtual"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/virtual"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/virtual failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/visual-builder
echo "📦 Publishing @elmoorx/visual-builder..."
cd "packages/visual-builder"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/visual-builder"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/visual-builder failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/vite-plugin
echo "📦 Publishing @elmoorx/vite-plugin..."
cd "packages/vite-plugin"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/vite-plugin"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/vite-plugin failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/voice
echo "📦 Publishing @elmoorx/voice..."
cd "packages/voice"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/voice"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/voice failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/wasm
echo "📦 Publishing @elmoorx/wasm..."
cd "packages/wasm"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/wasm"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/wasm failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/web-vitals
echo "📦 Publishing @elmoorx/web-vitals..."
cd "packages/web-vitals"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/web-vitals"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/web-vitals failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/web3
echo "📦 Publishing @elmoorx/web3..."
cd "packages/web3"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/web3"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/web3 failed"
  FAILED=$((FAILED + 1))
}
cd -
# @elmoorx/webhooks
echo "📦 Publishing @elmoorx/webhooks..."
cd "packages/webhooks"
npm publish $DRY_RUN --access public && {
  echo "  ✓ @elmoorx/webhooks"
  PUBLISHED=$((PUBLISHED + 1))
} || {
  echo "  ✗ @elmoorx/webhooks failed"
  FAILED=$((FAILED + 1))
}
cd -

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Published: $PUBLISHED / 78"
echo "  Failed:    $FAILED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
