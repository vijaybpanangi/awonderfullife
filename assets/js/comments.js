/* Comments widget for A Wonderful Life. Reads/posts to the API worker.
   User-supplied text is rendered with textContent only (never innerHTML) — no stored XSS. */
(function () {
  var API = 'https://api.awonderfullife.ca';
  var SITEKEY = '0x4AAAAAADlXh3xQof3Z3H_E';
  var root = document.getElementById('comments');
  if (!root) return;
  var slug = root.getAttribute('data-slug');
  if (!slug) return;

  var el = function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  var fmtDate = function (iso) {
    try { return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch (e) { return ''; }
  };

  var heading = el('h2', null, 'Comments');
  var list = el('div', 'comment-list');
  list.appendChild(el('p', 'comment-empty', 'Loading…'));
  root.appendChild(heading);
  root.appendChild(list);

  function renderList(comments) {
    list.textContent = '';
    if (!comments || !comments.length) {
      list.appendChild(el('p', 'comment-empty', 'No comments yet. Be the first.'));
      heading.textContent = 'Comments';
      return;
    }
    heading.textContent = 'Comments (' + comments.length + ')';
    comments.forEach(function (c) {
      var item = el('div', 'comment' + (c.removed ? ' comment-removed' : ''));
      if (c.removed) {
        item.appendChild(el('p', 'comment-body', c.body));
      } else {
        var meta = el('div', 'comment-meta');
        meta.appendChild(el('strong', null, c.name || 'Anonymous'));
        meta.appendChild(el('span', null, ' · ' + fmtDate(c.created_at)));
        item.appendChild(meta);
        item.appendChild(el('p', 'comment-body', c.body));
      }
      list.appendChild(item);
    });
  }

  function load() {
    fetch(API + '/comments?slug=' + encodeURIComponent(slug), { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (d) { renderList(d.comments); })
      .catch(function () { list.textContent = ''; list.appendChild(el('p', 'comment-empty', 'Comments are unavailable right now.')); });
  }

  // --- form ---
  var form = el('form', 'comment-form');
  var fName = el('input'); fName.type = 'text'; fName.placeholder = 'Your name'; fName.required = true; fName.maxLength = 80;
  var fEmail = el('input'); fEmail.type = 'email'; fEmail.placeholder = 'Your email (kept private, used once to confirm)'; fEmail.required = true;
  var fBody = el('textarea'); fBody.placeholder = 'Share a thought…'; fBody.required = true; fBody.rows = 4; fBody.maxLength = 4000;
  var ts = el('div', 'cf-turnstile');
  var btn = el('button', 'comment-submit', 'Post comment'); btn.type = 'submit';
  var msg = el('p', 'comment-msg'); msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
  [el('h3', null, 'Leave a comment'), fName, fEmail, fBody, ts, btn, msg].forEach(function (n) { form.appendChild(n); });
  var note = el('p', 'comment-note', 'First time? We email you a one-time link to confirm; your comment posts as soon as you click it. Comments are checked for spam and abuse.');
  form.appendChild(note);
  root.appendChild(form);

  var widgetId = null;
  function renderTurnstile() {
    if (window.turnstile && widgetId === null) {
      try { widgetId = window.turnstile.render(ts, { sitekey: SITEKEY, theme: 'light' }); } catch (e) {}
    }
  }
  renderTurnstile();
  // Turnstile script may load after us.
  var tsPoll = setInterval(function () { renderTurnstile(); if (widgetId !== null) clearInterval(tsPoll); }, 400);
  setTimeout(function () { clearInterval(tsPoll); }, 8000);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var token = (window.turnstile && widgetId !== null) ? window.turnstile.getResponse(widgetId) : '';
    if (!token) { msg.textContent = 'Please complete the spam check.'; return; }
    btn.disabled = true; msg.textContent = 'Sending…';
    fetch(API + '/comments', {
      method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug: slug, name: fName.value, email: fEmail.value, body: fBody.value, token: token }),
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (window.turnstile && widgetId !== null) window.turnstile.reset(widgetId);
        if (res.ok && res.d.status === 'posted') {
          msg.textContent = 'Posted. Thanks!'; fBody.value = ''; load();
        } else if (res.ok && res.d.status === 'verification_sent') {
          msg.textContent = 'Almost there — check your email for a confirmation link to publish your comment.';
          fBody.value = '';
        } else {
          msg.textContent = 'Could not post: ' + (res.d.error || 'try again');
        }
      })
      .catch(function () { msg.textContent = 'Network error. Please try again.'; })
      .finally(function () { btn.disabled = false; });
  });

  load();
})();
