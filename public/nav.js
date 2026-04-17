(function () {
  const isLanding = /^\/(landing\.html)?$/.test(location.pathname) || location.pathname === '/landing.html';
  const base = isLanding ? '' : '/landing.html';

  function href(hash) { return base + hash; }

  // Determine active page for nav link highlighting
  const path = location.pathname;
  function active(check) {
    return check === path || (check === '/compliance' && path === '/compliance') ||
      (check === '/docs' && path === '/docs') ? ' style="color:var(--gc-text,#242220)"' : '';
  }

  const NAV_CSS = `
<style id="gc-nav-css">
  :root{--gc-sky:#2e936f;--gc-text:#242220;--gc-muted:#7a6e68;--gc-bg:#faf9f7;--gc-surface:#fff;--gc-border:rgba(46,147,111,0.14);}
  #gc-nav{position:sticky;top:0;z-index:200;background:rgba(250,249,247,0.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--gc-border);font-family:'Inter',-apple-system,BlinkMacSystemFont,system-ui,sans-serif;}
  #gc-nav a{text-decoration:none;}
  .gc-nav-inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;padding:0 32px;height:60px;}
  .gc-nav-logo{display:flex;align-items:center;gap:9px;font-weight:700;font-size:1.05rem;letter-spacing:-0.025em;color:var(--gc-text);}
  .gc-nav-links{display:flex;align-items:center;gap:4px;}
  .gc-nav-links a{color:var(--gc-muted);font-size:0.88rem;font-weight:500;padding:7px 12px;border-radius:7px;transition:color .15s,background .15s;}
  .gc-nav-links a:hover,.gc-nav-links a.gc-active{color:var(--gc-text);background:rgba(46,147,111,0.07);}
  .gc-nav-right{display:flex;align-items:center;gap:10px;}
  .gc-nav-status{display:inline-flex;align-items:center;gap:6px;font-size:0.74rem;font-weight:600;color:var(--gc-sky);background:rgba(46,147,111,0.07);border:1px solid rgba(46,147,111,0.2);padding:5px 11px;border-radius:20px;white-space:nowrap;}
  .gc-nav-status:hover{background:rgba(46,147,111,0.12);border-color:rgba(46,147,111,0.3);}
  .gc-nav-dot{width:6px;height:6px;border-radius:50%;background:var(--gc-sky);box-shadow:0 0 6px var(--gc-sky);animation:gc-pulse 2.4s ease-in-out infinite;flex-shrink:0;}
  @keyframes gc-pulse{0%,100%{opacity:1}50%{opacity:.45}}
  .gc-nav-portal{color:var(--gc-muted);font-size:0.875rem;font-weight:500;padding:7px 14px;border-radius:7px;transition:color .15s;}
  .gc-nav-portal:hover{color:var(--gc-text);}
  .gc-nav-cta{background:var(--gc-text);color:var(--gc-bg);padding:8px 18px;border-radius:8px;border:none;font-size:0.84rem;font-weight:700;letter-spacing:-.01em;cursor:pointer;transition:opacity .15s;font-family:inherit;}
  .gc-nav-cta:hover{opacity:.85;}
  @media(max-width:768px){.gc-nav-links{display:none;}.gc-nav-status{display:none;}}
</style>`;

  const LOGO_SVG = `<svg width="20" height="26" viewBox="0 0 22 28" fill="none" aria-hidden="true"><path d="M11 0C4.93 0 0 4.93 0 11C0 18.7 11 28 11 28C11 28 22 18.7 22 11C22 4.93 17.07 0 11 0Z" fill="#2e936f"/><circle cx="11" cy="10.5" r="4.8" fill="#fff"/><circle cx="11" cy="10.5" r="1.9" fill="#2e936f"/></svg>`;

  // Active class helper
  function cls(check) {
    return (path === check || (check === '/compliance' && path.startsWith('/compliance')) || (check === '/docs' && path.startsWith('/docs'))) ? ' class="gc-active"' : '';
  }

  // CTA: on landing open modal, elsewhere go to /#signup
  const ctaHTML = isLanding
    ? `<button class="gc-nav-cta" onclick="openModal()">Get API key →</button>`
    : `<a href="/landing.html#signup" class="gc-nav-cta">Get API key →</a>`;

  const NAV_HTML = `
<nav id="gc-nav">
  <div class="gc-nav-inner">
    <a href="/landing.html" class="gc-nav-logo">${LOGO_SVG} GeoClear</a>
    <div class="gc-nav-links">
      <a href="${href('#features')}"${cls('')}>Features</a>
      <a href="${href('#risk-score')}">Risk Score</a>
      <a href="${href('#drone')}">Drone</a>
      <a href="${href('#pricing')}">Pricing</a>
      <a href="/compliance"${cls('/compliance')}>Compliance</a>
      <a href="/docs"${cls('/docs')}>Docs</a>
    </div>
    <div class="gc-nav-right">
      <a href="/status" class="gc-nav-status" title="Live system status" target="_blank">
        <span class="gc-nav-dot"></span>
        <span>99.9% uptime</span>
      </a>
      <a href="/portal.html" class="gc-nav-portal">Portal →</a>
      ${ctaHTML}
    </div>
  </div>
</nav>`;

  document.head.insertAdjacentHTML('beforeend', NAV_CSS);

  const placeholder = document.getElementById('gc-nav-placeholder');
  const existing = document.querySelector('nav');
  if (placeholder) {
    placeholder.outerHTML = NAV_HTML;
  } else if (existing) {
    existing.insertAdjacentHTML('beforebegin', NAV_HTML);
    existing.remove();
  } else {
    document.body.insertAdjacentHTML('afterbegin', NAV_HTML);
  }
})();
