#!/usr/bin/env bash
# Pre-push privacy + secret scan. Run from the repo root before EVERY push:
#   scripts/prepush-scan.sh            # scans the working tree (tracked + staged files)
#   scripts/prepush-scan.sh --history  # also scans every commit (git log -p --all)
# Exits 1 on any hit. Never prints token values from the environment.
set -u
export LC_ALL=C.UTF-8
cd "$(git rev-parse --show-toplevel)" || exit 2
fail=0
PATTERNS=(
  'usr[A-Za-z0-9]{14}'                                   # real Airtable user ids
  '[Dd]aniel|DANIEL'                                     # owner's name (any case/form)
  '(^|[^אבגדהוזחטיכךלמםנןסעפףצץקרשת])דני([^אבגדהוזחטיכךלמםנןסעפףצץקרשת]|$)'                              # Hebrew first name as a word (not «ידנית»)
  'בר דני|דני בר'
  '[A-Za-z0-9._%+-]+@(sapir\.ac\.il|mail\.sapir\.ac\.il|csf\.il|gmail\.com|walla\.co\.il|hotmail\.com|outlook\.com|yahoo\.com)'
  'C:\\\\?Users\\\\?[A-Za-z]+|/Users/[a-z]+'             # laptop user paths
  'ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|gho_[A-Za-z0-9]{20,}'
  'pat[A-Za-z0-9]{14}\.[a-f0-9]{40,}'                    # Airtable PAT
  'key[A-Za-z0-9]{14}'                                   # legacy Airtable API key
  'Bearer +[A-Za-z0-9._-]{20,}'
  'blk[A-Za-z0-9]{14}'                                   # block ids stay out
  '-----BEGIN [A-Z ]*PRIVATE KEY-----'
)
ALLOW='usrDEMOuser|340475390\+CinemaSapir@users\.noreply\.github\.com'
SELF='scripts/prepush-scan.sh'
scan_tree() {
  for p in "${PATTERNS[@]}"; do
    hits=$(git grep -I -n -E -e "$p" -- . ":(exclude)$SELF" ':(exclude)*.png' ':(exclude)*.pdf' ':(exclude)*package-lock.json' 2>/dev/null | grep -Ev "$ALLOW" || true)
    if [ -n "$hits" ]; then echo "FAIL [$p]:"; echo "$hits" | cut -c1-200 | head -20; fail=1; fi
  done
  # binary files that literally contain the name
  bin=$(git ls-files -z '*.png' '*.pdf' | xargs -0 -r grep -l -a -E 'Daniel|usr[A-Za-z0-9]{14}' 2>/dev/null || true)
  if [ -n "$bin" ]; then echo "FAIL [binary contains name]: $bin"; fail=1; fi
  # NOTE: text rendered inside images is NOT caught here; OCR new screenshots/maps (tesseract -l eng+heb) before adding them.
  # token from env must never be in any file
  for v in GITHUB_PAT AIRTABLE_PAT AIRTABLE_API_KEY; do
    val="${!v:-}"; [ -z "$val" ] && continue
    if git ls-files -z | xargs -0 grep -l -F -- "$val" 2>/dev/null | grep -q .; then echo "FAIL [\$$v value found in a tracked file]"; fail=1; fi
  done
}
scan_history() {
  log=$(git log -p --all --format='%H %an <%ae>%n%B' -- . ":(exclude)$SELF")
  for p in "${PATTERNS[@]}"; do
    n=$(printf '%s' "$log" | grep -a -E -c -e "$p" | head -1)
    m=$(printf '%s' "$log" | grep -a -E -e "$p" | grep -Ev "$ALLOW" | wc -l)
    if [ "$m" -gt 0 ]; then echo "FAIL history [$p]: $m line(s)"; fail=1; fi
  done
}
git diff --cached --quiet || echo "(scanning staged + tracked files)"
scan_tree
[ "${1:-}" = "--history" ] && scan_history
command -v gitleaks >/dev/null && { gitleaks git . --no-banner --staged >/dev/null 2>&1 || echo "WARN gitleaks: findings (review: gitleaks git . --staged -v)"; }
if [ $fail -ne 0 ]; then echo "prepush-scan: BLOCKED"; exit 1; fi
echo "prepush-scan: clean"
