#!/bin/bash
# E2E part 5: expand sidebar, logout, intern role verification
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

echo "=== ENSURE EXPANDED (persisted collapsed state) ==="
agent-browser eval "document.body.innerText.includes('Collapse') ? 'ALREADY_EXPANDED' : (() => { var b=document.querySelector('button[aria-label=\"Expand sidebar\"]'); if(!b) return 'NO_TOGGLE'; ['pointerdown','pointerup','click'].forEach(t=>b.dispatchEvent(new MouseEvent(t,{bubbles:true,cancelable:true}))); return 'EXPANDED_NOW'; })()" 2>&1 | head -c 120
sleep 1

echo ""
echo "=== CURRENT SESSION STATE ==="
agent-browser eval "document.body.innerText.includes('Sign in') ? 'AT_LOGIN' : 'LOGGED_IN'" 2>&1 | head -c 100

echo ""
echo "=== LOGOUT (if logged in) ==="
agent-browser find role button click --name "Priya Nair Manager" 2>&1 | tail -1
sleep 1.5
agent-browser find role menuitem click --name "Sign out" 2>&1 | tail -1
sleep 3
agent-browser eval "document.body.innerText.includes('Sign in') ? 'LOGGED_OUT_OK' : 'STILL_IN'" 2>&1 | head -c 100

echo ""
echo "=== LOGIN INTERN ==="
agent-browser find label "Company Email" fill "siddhesh@strides.com" 2>&1 | tail -1
agent-browser find label "Password" fill "password123" 2>&1 | tail -1
agent-browser find role button click --name "Sign In" 2>&1 | tail -1
sleep 7

echo "=== INTERN ROLE-AWARE NAV CHECK (expanded) ==="
agent-browser eval "var t=document.querySelector('aside')?.innerText || ''; JSON.stringify({reviewCenter: t.includes('Review Center'), myTeam: t.includes('My Team'), employeeMgmt: t.includes('Employee Mgmt'), attendance: t.includes('Attendance'), myTasks: t.includes('My Tasks'), groups: (t.match(/WORK|PEOPLE|TIME & HR|SERVICES|WORKSPACE/g)||[]).join(',')})" 2>&1 | head -c 350
agent-browser eval "document.body.innerText.includes('Siddhesh') ? 'SIDDHESH_SESSION_OK' : 'NAME_CHECK'" 2>&1 | head -c 100
agent-browser screenshot /home/z/my-project/download/e2e-intern-dashboard.png 2>&1 | tail -1

echo ""
echo "=== INTERN TASKS VIEW ==="
agent-browser find text "My Tasks" click 2>&1 | tail -1
sleep 3
agent-browser eval "var t=document.body.innerText; JSON.stringify({hasBoard: t.includes('Board'), hasList: t.includes('List'), statCards: (t.match(/Total Tasks|In Progress|Completed|Overdue/g)||[]).length, newTaskHidden: !t.includes('New Task')})" 2>&1 | head -c 300
agent-browser screenshot /home/z/my-project/download/e2e-intern-tasks.png 2>&1 | tail -1

echo ""
echo "=== TASK DETAIL (click first task card if any) ==="
agent-browser eval "var cards=document.querySelectorAll('button.rounded-lg.border'); cards.length ? 'CARDS:'+cards.length : 'NO_CARDS'" 2>&1 | head -c 100

echo ""
echo "=== MOBILE RESPONSIVE (intern) ==="
agent-browser set viewport 390 844 2>/dev/null
sleep 2
agent-browser eval "document.documentElement.scrollWidth <= window.innerWidth ? 'NO_H_OVERFLOW' : 'H_OVERFLOW'" 2>&1 | head -c 100
agent-browser screenshot /home/z/my-project/download/e2e-mobile-intern.png 2>&1 | tail -1

echo ""
echo "=== FINAL ERRORS ==="
agent-browser errors 2>&1 | head -c 300
agent-browser console 2>&1 | grep -icE "uncaught|typeerror|referenceerror" || true

agent-browser close 2>&1 | tail -1
echo "DONE"
