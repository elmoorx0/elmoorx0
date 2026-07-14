#!/bin/bash
# Start orchestrator in fully detached way
# Resolve repo root from script location (don't hardcode the path).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"
pkill -f "node scripts/orchestrator" 2>/dev/null
sleep 1

# Use daemon mode
nohup node scripts/orchestrator.cjs > /tmp/elmoorx-orchestrator.log 2>&1 &
ORCH_PID=$!
echo "Orchestrator PID: $ORCH_PID"

# Wait for services
sleep 5

# Check
ps -p $ORCH_PID > /dev/null && echo "Process alive" || echo "Process died"

# Show log
echo "---LOG---"
cat /tmp/elmoorx-orchestrator.log
