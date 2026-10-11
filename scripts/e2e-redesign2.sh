#!/bin/bash
# E2E part 2: collapse, tasks, intern role, mobile, notifications
cd /home/z/my-project/.next/standalone
HOSTNAME=0.0.0.0 PORT=3000 NODE_ENV=production NODE_OPTIONS='--max-old-space-size=512' node server.js &
SERVER_PID=$!
trap "kill -9 $SERVER_PID 2>/dev/null; pkill -9 -f 'next-server' 2>/dev/null" EXIT

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
sleep 2

echo "=== LOGIN MANAGER ==="
agent-browser find label "Company Email" fill "priya@strides.com" 2>&1 | tail -1
agent-browser find label "Password" fill "password123" 2>&1 | tail -1
agent-browser find role button click --name "Sign In" 2>&1 | tail -1
sleep 6

echo "=== TEST SIDEBAR COLLAPSE ==="
agent-browser find text "Collapse" click 2>&1 | tail -1
sleep 1
agent-browser eval "document.querySelector('aside').className.includes('w-[60px]') ? 'COLLAPSED_OK' : 'COLLAPSE_FAIL'" 2>&1 | head -c 200
agent-browser screenshot /home/z/my-project/download/e2e-sidebar-collapsed.png 2>&1 | tail -1
agent-browser find role button click --name "Expand sidebar" 2>&1 | tail -1
sleep 1
agent-browser eval "document.querySelector('aside').className.includes('w-[240px]') ? 'EXPANDED_OK' : 'EXPAND_FAIL'" 2>&1 | head -c 200

echo ""
echo "=== NAVIGATE MY TASKS ==="
agent-browser find text "My Tasks" click 2>&1 | tail -1
sleep 3
agent-browser eval "document.body.innerText.slice(0, 350)" 2>&1 | head -c 500
agent-browser screenshot /home/z/my-project/download/e2e-manager-tasks.png 2>&1 | tail -1

echo ""
echo "=== NOTIFICATIONS POPOVER ==="
agent-browser find role button click --name "Notifications" 2>&1 | tail -1
sleep 1.5
agent-browser eval "document.body.innerText.includes('Mark all read') || document.body.innerText.includes('No notifications') ? 'NOTIF_OK' : 'NOTIF_CHECK'" 2>&1 | head -c 200
agent-browser press Escape 2>&1 | tail -1

echo ""
echo "=== LOGOUT → LOGIN INTERN ==="
agent-browser find role button click --name "Priya Nair Manager" 2>&1 | tail -1
sleep 1
agent-browser find text "Sign out" click 2>&1 | tail -1
sleep 3
agent-browser find label "Company Email" fill "siddhesh@strides.com" 2>&1 | tail -1
agent-browser find label "Password" fill "password123" 2>&1 | tail -1
agent-browser find role button click --name "Sign In" 2>&1 | tail -1
sleep 6
agent-browser eval "document.body.innerText.slice(0, 400)" 2>&1 | head -c 550
agent-browser screenshot /home/z/my-project/download/e2e-intern-dashboard.png 2>&1 | tail -1

echo ""
echo "=== ERRORS CHECK ==="
agent-browser errors 2>&1 | head -c 400
agent-browser console 2>&1 | grep -iE "^E|error" | grep -v "WebSocket" | head -5

echo ""
echo "=== MOBILE VIEWPORT TEST ==="
agent-browser set viewport 390 844 2>/dev/null
sleep 2
agent-browser screenshot /home/z/my-project/download/e2e-mobile-intern.png 2>&1 | tail -1
agent-browser eval "document.documentElement.scrollWidth <= window.innerWidth ? 'NO_H_OVERFLOW' : 'H_OVERFLOW: ' + document.documentElement.scrollWidth" 2>&1 | head -c 200

agent-browser close 2>&1 | tail -1
echo "DONE"
