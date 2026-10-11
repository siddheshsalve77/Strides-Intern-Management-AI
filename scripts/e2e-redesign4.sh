#!/bin/bash
# E2E part 4: debug collapse + intern role check
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

echo "=== COLLAPSE DEBUG ==="
agent-browser eval "var b=document.querySelector('button[aria-label=\"Collapse sidebar\"]'); b ? 'BTN_FOUND' : 'BTN_MISSING'" 2>&1 | head -c 100
# real mouse click via coordinates-free playwright: use find with force via JS dispatch of pointer events
agent-browser eval "var b=document.querySelector('button[aria-label=\"Collapse sidebar\"]'); ['pointerdown','pointerup','click'].forEach(t=>b.dispatchEvent(new MouseEvent(t,{bubbles:true,cancelable:true}))); 'DISPATCHED'" 2>&1 | head -c 100
sleep 1.5
echo ""
agent-browser eval "document.querySelector('aside').className.match(/w-\[\d+px\]/)[0] + ' | store=' + (JSON.parse(localStorage.getItem('strides-one-store')||'{}').state?.sidebarCollapsed)" 2>&1 | head -c 200
agent-browser screenshot /home/z/my-project/download/e2e-sidebar-collapsed.png 2>&1 | tail -1

echo ""
echo "=== LOGOUT (real click, exact name) ==="
agent-browser find role button click --name "Priya Nair Priya Nair Manager" 2>&1 | tail -1
sleep 1.5
agent-browser find role menuitem click --name "Sign out" 2>&1 | tail -1
sleep 3
agent-browser eval "document.body.innerText.includes('Sign in') ? 'LOGGED_OUT_OK' : 'STILL_IN'" 2>&1 | head -c 100

echo ""
echo "=== LOGIN INTERN ==="
agent-browser find label "Company Email" fill "siddhesh@strides.com" 2>&1 | tail -1
agent-browser find label "Password" fill "password123" 2>&1 | tail -1
agent-browser find role button click --name "Sign In" 2>&1 | tail -1
sleep 6

echo "=== INTERN ROLE-AWARE NAV CHECK ==="
agent-browser eval "var t=document.body.innerText; JSON.stringify({reviewCenter: t.includes('Review Center'), myTeam: t.includes('My Team'), employeeMgmt: t.includes('Employee Mgmt'), attendance: t.includes('Attendance'), tasks: t.includes('My Tasks'), internName: t.includes('Siddhesh')})" 2>&1 | head -c 300
agent-browser screenshot /home/z/my-project/download/e2e-intern-dashboard.png 2>&1 | tail -1

echo ""
echo "=== INTERN TASKS VIEW ==="
agent-browser find text "My Tasks" click 2>&1 | tail -1
sleep 3
agent-browser eval "var t=document.body.innerText; JSON.stringify({hasBoard: t.includes('Board'), hasList: t.includes('List'), hasNewTaskBtn: t.includes('New Task'), statCards: (t.match(/Total Tasks|In Progress|Completed|Overdue/g)||[]).length})" 2>&1 | head -c 300
agent-browser screenshot /home/z/my-project/download/e2e-intern-tasks.png 2>&1 | tail -1

echo ""
echo "=== ERRORS ==="
agent-browser errors 2>&1 | head -c 300

agent-browser close 2>&1 | tail -1
echo "DONE"
