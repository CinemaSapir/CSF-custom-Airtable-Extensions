#!/bin/bash
# runs every e2e scenario in headless Chrome against the real bundle (SDK mocked); exit 1 on any failure
H="$(cd "$(dirname "$0")" && pwd)"
cd "$H/out" || exit 1
fail=0
for sc in move resize blocked "deny&deny=Slots_Events" create create-borrow reorder; do
  t=$(timeout 90 google-chrome --headless=new --no-sandbox --disable-gpu --window-size=1440,900 --virtual-time-budget=20000 --dump-dom "file://$PWD/index.html?e2e=$sc" 2>/dev/null | grep -o '<title>[^<]*' | sed 's/<title>//' | python3 -c 'import sys,html;print(html.unescape(sys.stdin.read()).strip())')
  echo "$t"
  echo "$t" | python3 -c 'import sys,json;d=json.loads(sys.stdin.read());sys.exit(0 if d["ok"] and not d["fail"] else 1)' 2>/dev/null || fail=1
done
node "$H/cdp-real-input.mjs" || fail=1
node "$H/cdp-v022.mjs" || fail=1
node "$H/cdp-v023.mjs" || fail=1
node "$H/cdp-v024.mjs" || fail=1
node "$H/cdp-v025.mjs" || fail=1
node "$H/cdp-v026.mjs" || fail=1
exit $fail
