#!/bin/bash
# Full server-side login flow test in a single command (sandbox kills bg processes between commands)
set -x

API_KEY="AIzaSyDuyBKKsrb7rnL73TZpB9dG2wmGUlnjYBk"
EMAIL="priya@strides.com"
PASSWORD="password123"

# 1. Get ID token via Firebase REST API
echo "=== Getting ID token ==="
TOKEN_RESP=$(curl -s -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\",\"returnSecureToken\":true}")
echo "$TOKEN_RESP" | head -c 300
echo ""
TOKEN=$(echo "$TOKEN_RESP" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).idToken||'')}catch(e){console.log('')}})")

if [ -z "$TOKEN" ]; then
  echo "FAILED TO GET TOKEN"
  exit 1
fi
echo "TOKEN length: ${#TOKEN}"

# 2. Start server in background (within this command session)
cd /home/z/my-project/.next/standalone
HOSTNAME=0.0.0.0 PORT=3000 NODE_ENV=production NODE_OPTIONS='--max-old-space-size=512' node server.js > /tmp/server-test.log 2>&1 &
SERVER_PID=$!

# 3. Wait for boot
for i in $(seq 1 30); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ --max-time 2)
  if [ "$CODE" = "200" ]; then echo "SERVER UP after ${i}s"; break; fi
  sleep 1
done

# 4. Test /api/auth/me with Bearer token
echo "=== /api/auth/me ==="
ME_RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}" http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer ${TOKEN}" --max-time 20)
echo "$ME_RESP" | head -c 1000

# 5. Test /api/employees (dashboard data source)
echo ""
echo "=== /api/employees ==="
curl -s -w "\nHTTP_STATUS:%{http_code}" http://localhost:3000/api/employees \
  -H "Authorization: Bearer ${TOKEN}" --max-time 20 | head -c 500

echo ""
echo "=== server log tail ==="
tail -30 /tmp/server-test.log

kill $SERVER_PID 2>/dev/null
echo "DONE"
