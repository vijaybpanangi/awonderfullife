(function () {
  var btn = document.querySelector('.theme-toggle');
  if (!btn) return;
  var root = document.documentElement;

  function systemPrefersDark() {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function effectiveTheme() {
    var t = root.dataset.theme;
    if (t === 'dark' || t === 'light') return t;
    return systemPrefersDark() ? 'dark' : 'light';
  }
  function reflect() {
    btn.setAttribute('aria-pressed', String(effectiveTheme() === 'dark'));
  }

  reflect();

  btn.addEventListener('click', function () {
    var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) { /* storage unavailable; theme still applies for this page */ }
    reflect();
  });
})();
