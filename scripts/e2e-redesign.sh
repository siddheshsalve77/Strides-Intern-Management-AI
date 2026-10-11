#!/bin/bash
# E2E verification for STRIDES ONE redesign — server + browser inside one command
cd /home/z/my-project/.next/standalone
HOSTNAME=0.0.0.0 PORT=3000 NODE_ENV=production NODE_OPTIONS='--max-old-space-size=512' node server.js &
SERVER_PID=$!
trap "kill -9 $SERVER_PID 2>/dev/null; pkill -9 -f 'next-server' 2>/dev/null" EXIT

# wait for readiness
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 http://localhost:3000 2>/dev/null)
  [ "$code" = "200" ] && break
  sleep 1
done
echo "SERVER_READY: $code"

agent-browser close 2>/dev/null
agent-browser set viewport 1440 900 2>/dev/null
agent-browser open http://localhost:3000 2>&1 | tail -1
agent-browser wait --load networkidle 2>&1 | tail -1

echo "=== LOGIN SCREEN ==="
agent-browser snapshot -i -c 2>&1 | head -c 1500

echo ""
echo "=== LOGIN AS MANAGER ==="
agent-browser find label "Company Email" fill "priya@strides.com" 2>&1 | tail -1
agent-browser find label "Password" fill "password123" 2>&1 | tail -1
agent-browser find role button click --name "Sign In" 2>&1 | tail -1
sleep 6
agent-browser wait --load networkidle 2>&1 | tail -1
agent-browser get title 2>&1 | head -c 100

echo ""
echo "=== MANAGER DASHBOARD CHECK ==="
agent-browser eval "document.body.innerText.slice(0, 600)" 2>&1 | head -c 800

echo ""
echo "=== ERRORS CHECK 1 ==="
agent-browser errors 2>&1 | head -c 500
agent-browser console 2>&1 | grep -iE "error|fail" | head -5

echo ""
echo "=== SCREENSHOT MANAGER DASHBOARD ==="
agent-browser screenshot /home/z/my-project/download/e2e-manager-dashboard.png 2>&1 | tail -1
