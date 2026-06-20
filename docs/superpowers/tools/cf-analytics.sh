#!/usr/bin/env bash
#
# cf-analytics.sh — Cloudflare traffic report for one or more zones.
#
# Reads a READ-ONLY Cloudflare API token from $CLOUDFLARE_ANALYTICS_TOKEN, or from
# ~/.cloudflare_analytics_token (single line). NEVER commit the token.
# Create one at: Cloudflare dashboard -> My Profile -> API Tokens ->
#   template "Read analytics and logs", scoped to the zone(s) you want.
#
# Usage:
#   docs/superpowers/tools/cf-analytics.sh                    # default domains, 30 days
#   docs/superpowers/tools/cf-analytics.sh --days 14         # custom window
#   docs/superpowers/tools/cf-analytics.sh foo.com bar.io    # specific domains
#
# Notes:
#   - Cloudflare's free plan retains ~30 days of daily analytics.
#   - "uniques (sum of daily)" overcounts true period-uniques; it's a volume proxy.
#   - pageViews + uniques are the human signal; requests includes assets + bots.

API="https://api.cloudflare.com/client/v4"
DAYS=30
DOMAINS=()

while [ $# -gt 0 ]; do
  case "$1" in
    --days) DAYS="$2"; shift 2 ;;
    --days=*) DAYS="${1#*=}"; shift ;;
    -h|--help) sed -n '3,20p' "$0"; exit 0 ;;
    -*) echo "unknown flag: $1" >&2; exit 2 ;;
    *) DOMAINS+=("$1"); shift ;;
  esac
done
[ ${#DOMAINS[@]} -eq 0 ] && DOMAINS=(awonderfullife.ca ezziclarity.ca)

TOKEN="${CLOUDFLARE_ANALYTICS_TOKEN:-}"
if [ -z "$TOKEN" ] && [ -f "$HOME/.cloudflare_analytics_token" ]; then
  TOKEN="$(tr -d '[:space:]' < "$HOME/.cloudflare_analytics_token")"
fi
if [ -z "$TOKEN" ]; then
  echo "No token. Set CLOUDFLARE_ANALYTICS_TOKEN or put it in ~/.cloudflare_analytics_token" >&2
  exit 1
fi

# Known zone IDs (not secret) so an analytics-only token (no Zone:Read) still resolves.
zone_id() {
  case "$1" in
    awonderfullife.ca) echo "3eec7ef1026c1a9f2d6052f0bf7bdaad" ;;
    ezziclarity.ca)    echo "57611fabcdb5da51a08bfe324d367940" ;;
    *) curl -s -H "Authorization: Bearer $TOKEN" "$API/zones?name=$1" \
         | python3 -c 'import sys,json;r=(json.load(sys.stdin).get("result") or []);print(r[0]["id"] if r else "")' ;;
  esac
}

# Date window (BSD/macOS first, then GNU/Linux).
SINCE="$(date -u -v-"$((DAYS-1))"d +%Y-%m-%d 2>/dev/null || date -u -d "$((DAYS-1)) days ago" +%Y-%m-%d)"
UNTIL="$(date -u +%Y-%m-%d)"
TMP="$(mktemp)"; trap 'rm -f "$TMP"' EXIT

for DOMAIN in "${DOMAINS[@]}"; do
  echo
  echo "===== $DOMAIN  ($SINCE .. $UNTIL) ====="
  ZONE="$(zone_id "$DOMAIN")"
  if [ -z "$ZONE" ]; then echo "  zone not found / token lacks access"; continue; fi
  PAYLOAD="$(ZONE="$ZONE" SINCE="$SINCE" UNTIL="$UNTIL" python3 <<'PY'
import json, os
q = ("query($zone:String!,$since:Date!,$until:Date!){viewer{zones(filter:{zoneTag:$zone})"
     "{httpRequests1dGroups(limit:90,filter:{date_geq:$since,date_leq:$until},orderBy:[date_ASC])"
     "{dimensions{date}sum{requests pageViews bytes threats}uniq{uniques}}}}}")
print(json.dumps({"query": q, "variables": {
    "zone": os.environ["ZONE"], "since": os.environ["SINCE"], "until": os.environ["UNTIL"]}}))
PY
)"
  curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
       --data "$PAYLOAD" "$API/graphql" > "$TMP"
  python3 - "$TMP" <<'PY'
import sys, json, statistics
d = json.load(open(sys.argv[1]))
zs = (d.get("data") or {}).get("viewer", {}).get("zones") if d.get("data") else None
if not zs:
    print("  error:", json.dumps(d.get("errors"))[:600]); sys.exit()
g = zs[0]["httpRequests1dGroups"]
if not g:
    print("  no data in range"); sys.exit()
S = lambda k: sum(r["sum"][k] for r in g)
uniq = sum(r["uniq"]["uniques"] for r in g)
print("  days={} ({} .. {})".format(len(g), g[0]["dimensions"]["date"], g[-1]["dimensions"]["date"]))
print("  TOTAL : requests={:,}  pageViews={:,}  uniques(sumDaily)={:,}  threats={:,}  GB={:.2f}".format(
    S("requests"), S("pageViews"), uniq, S("threats"), S("bytes") / 1e9))
print("  AVG/day: pageViews={:.0f}  uniques={:.0f}".format(
    statistics.mean([r["sum"]["pageViews"] for r in g]),
    statistics.mean([r["uniq"]["uniques"] for r in g])))
print("  last 7 (date / requests / pageViews / uniques):")
for r in g[-7:]:
    print("    ", r["dimensions"]["date"], r["sum"]["requests"], r["sum"]["pageViews"], r["uniq"]["uniques"])
PY
done
