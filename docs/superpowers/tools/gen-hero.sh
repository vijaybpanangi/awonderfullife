#!/usr/bin/env bash
# Generate one post hero via Cloudflare Workers AI (flux-1-schnell).
# Usage: docs/superpowers/tools/gen-hero.sh <slug> "<subject prompt>" <seed>
# Reads credentials from $HOME (never from the repo). Writes assets/images/posts/<slug>.jpg
set -euo pipefail
SLUG="$1"; PROMPT="$2"; SEED="${3:-7}"
STYLE="flat editorial illustration, muted warm palette of terracotta, slate blue and cream, subtle paper grain texture, minimal composition, generous negative space, no text, no lettering, no signage"
TOKEN=$(cat "$HOME/.cloudflare_ai_token"); ACCT=$(cat "$HOME/.cloudflare_ai_account")
TMP=$(mktemp)
python3 -c 'import json,sys; print(json.dumps({"prompt": sys.argv[1]+", "+sys.argv[2], "steps": 8, "seed": int(sys.argv[3]), "width": 1600, "height": 896}))' \
  "$PROMPT" "$STYLE" "$SEED" > "$TMP.req"
curl -s --max-time 120 -X POST \
  "https://api.cloudflare.com/client/v4/accounts/${ACCT}/ai/run/@cf/black-forest-labs/flux-1-schnell" \
  -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
  --data @"$TMP.req" -o "$TMP"
python3 - "$TMP" "assets/images/posts/${SLUG}.jpg" <<'PY'
import json, base64, sys, io
from PIL import Image
d = json.load(open(sys.argv[1]))
if not d.get("success"):
    raise SystemExit(f"API error: {d.get('errors')}")
img = Image.open(io.BytesIO(base64.b64decode(d["result"]["image"]))).convert("RGB")
img.save(sys.argv[2], "JPEG", quality=80, optimize=True, progressive=True)
PY
rm -f "$TMP" "$TMP.req"
ls -la "assets/images/posts/${SLUG}.jpg"
