/* Appreciate button for A Wonderful Life. Reads/posts a per-post reaction
   count to the API worker. All rendered text is set via textContent — no
   innerHTML, no stored/reflected XSS. Degrades silently: if the API is
   unreachable the button still renders (count 0), it just never updates. */
(function () {
  var API = 'https://api.awonderfullife.ca';
  var root = document.querySelector('.reactions');
  if (!root) return;
  var slug = root.getAttribute('data-slug');
  if (!slug) return;

  var STORAGE_KEY = 'awl_reacted_' + slug;
  // localStorage is UX only (skip the button's own re-post, show the filled
  // state to a returning visitor) — the server is the real guard, throttling
  // per salted daily IP-hash regardless of what the client remembers.
  var reacted = false;
  try { reacted = localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { reacted = false; }

  var count = 0;
  var pending = false;

  var el = function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  var safeCount = function (v) {
    var n = Number(v);
    return (isFinite(n) && n >= 0) ? Math.floor(n) : 0;
  };

  var btn = el('button', 'reaction-btn');
  btn.type = 'button';
  var icon = el('span', 'reaction-icon');
  icon.setAttribute('aria-hidden', 'true');
  var countEl = el('span', 'reaction-count');
  btn.appendChild(icon);
  btn.appendChild(countEl);
  root.appendChild(btn);

  function render() {
    icon.textContent = reacted ? '♥' : '♡'; // filled heart : outline heart
    countEl.textContent = String(count);
    btn.classList.toggle('is-reacted', reacted);
    btn.setAttribute('aria-pressed', reacted ? 'true' : 'false');
    var noun = count === 1 ? 'appreciation' : 'appreciations';
    btn.setAttribute('aria-label', (reacted ? 'You appreciated this post. ' : 'Appreciate this post. ') + count + ' ' + noun);
  }
  render();

  function load() {
    fetch(API + '/reactions?slug=' + encodeURIComponent(slug))
      .then(function (r) { return r.json(); })
      .then(function (d) { count = safeCount(d && d.count); render(); })
      .catch(function () { /* API unreachable: leave the button at count 0 */ });
  }
  load();

  btn.addEventListener('click', function () {
    if (pending || reacted) return;
    pending = true;
    btn.disabled = true;
    fetch(API + '/reactions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug: slug }),
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok) return;
        // Throttled or not, the API always returns the current count; reflect
        // it and mark appreciated either way — silent by design, no error UI.
        count = safeCount(res.d && res.d.count);
        reacted = true;
        try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) { /* storage unavailable; state just won't persist */ }
        render();
      })
      .catch(function () { /* network error: leave state as-is, no error message */ })
      .finally(function () { pending = false; btn.disabled = false; });
  });
})();
