#!/bin/bash
# E2E part 3: precise collapse/notifications/logout/intern tests
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

echo "=== COLLAPSE via aria-label ==="
agent-browser find role button click --name "Collapse sidebar" 2>&1 | tail -1
sleep 1
agent-browser eval "document.querySelector('aside').className" 2>&1 | grep -o "w-\[60px\]\|w-\[240px\]" | head -1
agent-browser screenshot /home/z/my-project/download/e2e-sidebar-collapsed.png 2>&1 | tail -1
agent-browser find role button click --name "Expand sidebar" 2>&1 | tail -1
sleep 1
agent-browser eval "document.querySelector('aside').className" 2>&1 | grep -o "w-\[60px\]\|w-\[240px\]" | head -1

echo "=== NOTIFICATIONS BELL (via title attr) ==="
agent-browser eval "var b=document.querySelector('button[title=\"Notifications\"]'); b ? b.click() : 'NO_BELL'" 2>&1 | head -c 100
sleep 1.5
agent-browser eval "document.body.innerText.includes('Mark all read') ? 'MARK_READ_OK' : document.body.innerText.includes('No notifications') ? 'EMPTY_OK' : 'POPOVER_CONTENT:' + document.body.innerText.slice(0,120)" 2>&1 | head -c 250
agent-browser press Escape 2>&1 | tail -1

echo ""
echo "=== LOGOUT via eval ==="
agent-browser eval "var b=document.querySelector('button[title=\"Notifications\"]'); var btns=[...document.querySelectorAll('header button')]; var ub=btns.find(x=>x.textContent.includes('Priya')||x.querySelector('[alt]')); ub ? ub.click() : 'NO_USERBTN'" 2>&1 | head -c 100
sleep 1.2
agent-browser eval "[...document.querySelectorAll('[role=menuitem]')].find(m=>m.textContent.includes('Sign out')) ? 'MENU_OPEN' : 'NO_MENU'" 2>&1 | head -c 100
agent-browser find text "Sign out" click 2>&1 | tail -1
sleep 3
agent-browser eval "document.body.innerText.includes('Sign in') ? 'LOGGED_OUT_OK' : 'STILL_IN'" 2>&1 | head -c 100

echo ""
echo "=== LOGIN INTERN ==="
agent-browser find label "Company Email" fill "siddhesh@strides.com" 2>&1 | tail -1
agent-browser find label "Password" fill "password123" 2>&1 | tail -1
agent-browser find role button click --name "Sign In" 2>&1 | tail -1
sleep 6

echo "=== INTERN ROLE CHECK ==="
agent-browser eval "var t=document.body.innerText; (t.includes('Review Center') ? 'HAS_REVIEW_CENTER(BAD)' : 'NO_REVIEW_CENTER_OK') + '|' + (t.includes('My Team') ? 'HAS_MY_TEAM(BAD)' : 'NO_MY_TEAM_OK') + '|' + (t.includes('Employee Mgmt') ? 'HAS_ADMIN(BAD)' : 'NO_ADMIN_OK')" 2>&1 | head -c 250
agent-browser eval "document.body.innerText.slice(0, 300)" 2>&1 | head -c 400
agent-browser screenshot /home/z/my-project/download/e2e-intern-dashboard.png 2>&1 | tail -1

echo ""
echo "=== INTERN TASK OPEN ==="
agent-browser find text "My Tasks" click 2>&1 | tail -1
sleep 3
agent-browser eval "document.body.innerText.slice(0, 250)" 2>&1 | head -c 350
agent-browser screenshot /home/z/my-project/download/e2e-intern-tasks.png 2>&1 | tail -1

echo ""
echo "=== FINAL ERRORS ==="
agent-browser errors 2>&1 | head -c 300
agent-browser console 2>&1 | grep -icE "uncaught|typeerror|referenceerror" || true

agent-browser close 2>&1 | tail -1
echo "DONE"
