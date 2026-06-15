#!/usr/bin/env bash
# check-email-dns.sh — smoke-test the email DNS for an iCloud+ Custom Email Domain.
#
# Usage:  bash docs/superpowers/tools/check-email-dns.sh [domain]
#         (default domain: awonderfullife.ca)
#
# Queries public DNS over HTTPS (dns.google) — `dig` is not installed here.
# This is a SMOKE TEST against a caching resolver, NOT authoritative proof of
# global propagation: a passing result can lag the old TTL, and Apple's own
# "Verify" button remains the source of truth. Lower record TTLs (60-300s)
# during cutover. Checks MX / SPF / DKIM(sig1) / DMARC / apple-domain against
# the expected iCloud values, and flags leftover Cloudflare Email-Routing
# records that would block Apple's MX.
set -euo pipefail
DOMAIN="${1:-awonderfullife.ca}"
python3 - "$DOMAIN" <<'PY'
import sys, json, urllib.request, urllib.parse

domain = sys.argv[1]
def doh(name, rtype):
    url = "https://dns.google/resolve?" + urllib.parse.urlencode({"name": name, "type": rtype})
    try:
        with urllib.request.urlopen(url, timeout=20) as r:
            d = json.load(r)
    except Exception as e:
        return [], f"query error: {e}"
    out = []
    for a in d.get("Answer", []):
        out.append((a.get("type"), a.get("data", "")))
    return out, None

def txt_join(data):
    # DoH returns long TXT split into "chunk1" "chunk2"; strip quotes and join.
    parts = [p for p in data.split('"') if p.strip() not in ("", " ")]
    return "".join(parts) if parts else data.strip('"')

OK, WARN, FAIL = "PASS", "WARN", "FAIL"
def line(tag, msg): print(f"  [{tag}] {msg}")

print(f"\n=== email DNS smoke test: {domain} (via dns.google DoH) ===")

# --- MX ---
print("MX:")
ans, err = doh(domain, "MX")
if err: line(FAIL, err)
else:
    mxs = [d.split()[-1].rstrip(".").lower() for t, d in ans if t == 15]
    icloud = [m for m in mxs if m.endswith("mail.icloud.com")]
    cf = [m for m in mxs if "mx.cloudflare.net" in m]
    if not mxs: line(WARN, "no MX yet (expected mx01/mx02.mail.icloud.com)")
    if set(icloud) >= {"mx01.mail.icloud.com", "mx02.mail.icloud.com"}:
        line(OK, "mx01 + mx02.mail.icloud.com present")
    elif icloud:
        line(WARN, f"partial iCloud MX: {icloud}")
    if cf: line(FAIL, f"Cloudflare Email-Routing MX still present (must remove): {cf}")
    other = [m for m in mxs if not m.endswith("mail.icloud.com") and "mx.cloudflare.net" not in m]
    if other: line(WARN, f"unexpected MX: {other}")

# --- SPF (apex TXT) ---
print("SPF:")
ans, err = doh(domain, "TXT")
if err: line(FAIL, err)
else:
    txts = [txt_join(d) for t, d in ans if t == 16]
    spfs = [t for t in txts if t.lower().startswith("v=spf1")]
    if len(spfs) == 0: line(WARN, "no SPF record yet")
    elif len(spfs) > 1: line(FAIL, f"MULTIPLE SPF records (PermError; must merge to one): {spfs}")
    else:
        s = spfs[0]
        if "include:icloud.com" in s: line(OK, f"iCloud SPF: {s}")
        else: line(WARN, f"SPF present but no include:icloud.com: {s}")
        if "_spf.wpcloud.com" in s: line(WARN, "legacy _spf.wpcloud.com still in SPF (remove unless still sending)")
        if "_spf.mx.cloudflare.net" in s: line(FAIL, "Cloudflare Email-Routing SPF still present (must remove)")
    apple = [t for t in txts if t.startswith("apple-domain=")]
    line(OK if apple else WARN, "apple-domain verification TXT present (keep permanently)" if apple else "no apple-domain verification TXT yet")

# --- DKIM (CNAME at sig1._domainkey) ---
print("DKIM (sig1._domainkey):")
ans, err = doh(f"sig1._domainkey.{domain}", "CNAME")
if err: line(FAIL, err)
else:
    cn = [d.rstrip(".").lower() for t, d in ans if t == 5]
    if any("icloudmailadmin.com" in c for c in cn): line(OK, f"iCloud DKIM CNAME: {cn[0]}")
    elif cn: line(WARN, f"CNAME present but not iCloud: {cn}")
    else: line(WARN, "no DKIM CNAME yet (expected sig1.dkim.<domain>.at.icloudmailadmin.com)")

# leftover Cloudflare DKIM selector
ans, _ = doh(f"cf2024-1._domainkey.{domain}", "CNAME")
if any(t == 5 for t, _ in ans): line(FAIL, "Cloudflare Email-Routing DKIM (cf2024-1._domainkey) still present (must remove)")

# --- DMARC ---
print("DMARC (_dmarc):")
ans, err = doh(f"_dmarc.{domain}", "TXT")
if err: line(FAIL, err)
else:
    dm = [txt_join(d) for t, d in ans if t == 16 and "v=DMARC1" in txt_join(d)]
    if not dm: line(WARN, "no DMARC record")
    else:
        d0 = dm[0]
        has_rua = "rua=" in d0
        line(OK if has_rua else WARN, f"DMARC: {d0}" + ("" if has_rua else "  (no rua= — reports go nowhere)"))

print("\nNote: smoke test only. Confirm in Apple's Custom Email Domain 'Verify' step before sending mail.\n")
PY
