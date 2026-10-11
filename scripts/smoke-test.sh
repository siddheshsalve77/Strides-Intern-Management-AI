#!/usr/bin/env bash
# STRIDES ONE — post-redesign smoke test (single bash session; server stays up inside)
set -u
cd /home/z/my-project/.next/standalone
HOSTNAME=0.0.0.0 PORT=3000 NODE_ENV=production NODE_OPTIONS='--max-old-space-size=512' nohup timeout 3600 node server.js > /home/z/my-project/server-standalone.log 2>&1 &
SRV=$!

code="000"
for i in $(seq 1 25); do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 http://localhost:3000 || true)
  [ "$code" = "200" ] && break
  sleep 1
done
echo "SERVER_HTTP:$code (pid $SRV)"

agent-browser close >/dev/null 2>&1 || true

echo "=== 1. LOGIN SCREEN ==="
agent-browser open http://localhost:3000 || { echo "OPEN_FAILED"; kill -9 $SRV 2>/dev/null; exit 1; }
agent-browser wait --load networkidle
agent-browser errors
agent-browser screenshot /home/z/my-project/download/smoke-01-login.png

echo "=== 2. MANAGER LOGIN ==="
agent-browser find label "Company Email" fill "priya@strides.com"
agent-browser find label "Password" fill "password123"
agent-browser find text "Sign In" click
sleep 7
echo "── dashboard snapshot ──"
agent-browser snapshot -c 2>/dev/null | grep -Ei "attendance|leave|tasks|completion|good |check in|check out|hello|welcome" | head -14
echo "── page errors (dashboard) ──"
agent-browser errors
agent-browser screenshot /home/z/my-project/download/smoke-02-manager-dashboard.png

echo "=== 3. TASKS VIEW (manager) ==="
agent-browser find text "My Tasks" click 2>/dev/null || true
sleep 3
agent-browser snapshot -c 2>/dev/null | grep -Ei "board|list|pending|overdue|completed|no tasks" | head -10
agent-browser errors
agent-browser screenshot /home/z/my-project/download/smoke-03-tasks.png

echo "=== 4. AI ASSISTANT ==="
agent-browser find text "AI Assistant" click 2>/dev/null || true
sleep 3
agent-browser snapshot -c 2>/dev/null | grep -Ei "ask me anything|strides ai|beta" | head -6
agent-browser errors

echo "=== 5. LOGOUT → INTERN LOGIN ==="
agent-browser find text "Sign out" click 2>/dev/null || true
sleep 4
agent-browser find label "Company Email" fill "siddhesh@strides.com" 2>/dev/null || { agent-browser open http://localhost:3000; agent-browser find label "Company Email" fill "siddhesh@strides.com"; }
agent-browser find label "Password" fill "password123"
agent-browser find text "Sign In" click
sleep 7
echo "── intern dashboard ──"
agent-browser snapshot -c 2>/dev/null | grep -Ei "attendance|leave|tasks|completion|quick actions" | head -10
agent-browser errors
agent-browser screenshot /home/z/my-project/download/smoke-04-intern-dashboard.png

echo "=== 6. INTERN TASKS → SUBMISSION UI ==="
agent-browser find text "My Tasks" click 2>/dev/null || true
sleep 3
agent-browser screenshot /home/z/my-project/download/smoke-05-intern-tasks.png
agent-browser errors

echo "=== 7. MOBILE RESPONSIVE ==="
agent-browser set viewport 390 844
sleep 2
agent-browser screenshot /home/z/my-project/download/smoke-06-mobile.png
agent-browser set viewport 1440 900

echo "=== 8. FINAL ERROR CHECK ==="
agent-browser errors
echo "SMOKE_DONE server_left_running_pid_$SRV"
