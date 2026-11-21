(() => {
  'use strict';
  const id = 'G-MK1NPN5N6N';
  const disabled = 'ga-disable-' + id;
  const key = 'dannelly-analytics-preference-v1';
  const lifetimeSeconds = 180 * 24 * 60 * 60;
  const panel = document.getElementById('cookie-preferences');
  const opener = document.getElementById('open-analytics-preferences');
  const allow = document.getElementById('allow-analytics');
  const reject = document.getElementById('reject-analytics');
  const status = document.getElementById('analytics-status');
  window[disabled] = true;
  if (!panel || !opener || !allow || !reject || !status) return;

  let loaded = false;
  let choice = null;
  function restore(raw) {
    try {
      const saved = JSON.parse(raw);
      return saved && (saved.choice === 'allow' || saved.choice === 'reject')
        && Number.isFinite(saved.until) && saved.until > Date.now() ? saved.choice : null;
    } catch {
      return null;
    }
  }

  function removeAnalyticsCookies() {
    const apex = 'dannellysolutions.com';
    const host = location.hostname;
    const domains = host === apex || host === 'www.' + apex ? ['', '; Domain=' + apex, '; Domain=' + host] : [''];
    // Expire only this site's known Google Analytics cookies. No cookie reads are needed.
    for (const name of ['_ga', '_ga_' + id.slice(2)]) {
      for (const domain of new Set(domains)) {
        document.cookie = name + '=; Max-Age=0; Path=/' + domain;
      }
    }
  }

  function enable() {
    window[disabled] = false;
    if (loaded) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    gtag('consent', 'default', {
      analytics_storage: 'granted', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied',
    });
    gtag('js', new Date());
    gtag('config', id, {
      allow_google_signals: false, allow_ad_personalization_signals: false,
      cookie_expires: lifetimeSeconds, cookie_update: false,
      page_location: location.origin + location.pathname,
    });
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    tag.addEventListener('load', () => {
      if (choice !== 'allow') removeAnalyticsCookies();
    });
    document.head.appendChild(tag);
  }

  function apply(next) {
    choice = next;
    if (next === 'allow') {
      enable();
    } else {
      window[disabled] = true;
      if (next === 'reject') removeAnalyticsCookies();
    }
    reject.textContent = next === 'allow' ? 'Turn off analytics' : 'Keep analytics off';
    status.textContent = next === 'allow' ? 'Analytics is on.'
      : next === 'reject' ? 'Analytics is off.' : 'Analytics is off unless you allow it.';
  }

  function choose(next) {
    apply(next);
    try {
      localStorage.setItem(key, JSON.stringify({ choice: next, until: Date.now() + lifetimeSeconds * 1000 }));
    } catch {
      status.textContent += ' Your browser could not save this choice for future visits.';
    }
  }

  try { apply(restore(localStorage.getItem(key))); } catch { apply(null); }
  panel.hidden = choice !== null && location.hash !== '#cookie-preferences';
  opener.hidden = false;
  opener.addEventListener('click', () => {
    panel.hidden = false;
    document.getElementById('cookie-preferences-title').focus();
  });
  document.getElementById('cookie-preferences-title').tabIndex = -1;
  allow.addEventListener('click', () => choose('allow'));
  reject.addEventListener('click', () => choose('reject'));
  window.addEventListener('storage', (event) => {
    if (event.key === key || event.key === null) apply(restore(event.newValue));
  });
})();
