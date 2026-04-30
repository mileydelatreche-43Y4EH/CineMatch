if (!window.__cinematchNavRouterInitialized) {
  window.__cinematchNavRouterInitialized = true;

  const ROUTER_SCRIPT_PATH = '/src/nav-router.js';

  function isEligibleLink(anchor) {
    if (!anchor) return false;
    if (anchor.target && anchor.target !== '_self') return false;
    if (anchor.hasAttribute('download')) return false;
    if (anchor.getAttribute('rel') === 'external') return false;
    const href = anchor.getAttribute('href') || '';
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
    try {
      const url = new URL(anchor.href, window.location.origin);
      const isHtmlRoute = url.pathname.endsWith('.html') || url.pathname === '/';
      return url.origin === window.location.origin && isHtmlRoute;
    } catch {
      return false;
    }
  }

  function runBodyScripts() {
    const scripts = Array.from(document.body.querySelectorAll('script'));
    scripts.forEach((oldScript) => {
      const src = oldScript.getAttribute('src') || '';
      if (src.includes(ROUTER_SCRIPT_PATH)) {
        oldScript.remove();
        return;
      }
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach((attr) => {
        if (attr.name === 'src') return;
        newScript.setAttribute(attr.name, attr.value);
      });
      if (src) {
        const absolute = new URL(src, window.location.origin);
        if ((oldScript.getAttribute('type') || '').toLowerCase() === 'module') {
          absolute.searchParams.set('nav', String(Date.now()));
        }
        newScript.src = absolute.toString();
      } else {
        newScript.textContent = oldScript.textContent || '';
      }
      oldScript.replaceWith(newScript);
    });
  }

  async function navigateTo(url, pushState = true) {
    const targetUrl = new URL(url, window.location.origin);
    if (targetUrl.href === window.location.href) return;
    const response = await fetch(targetUrl.href, {
      credentials: 'same-origin',
      headers: { 'X-CineMatch-Nav': '1' },
    });
    if (!response.ok) throw new Error(`Navigation impossible (${response.status})`);
    const html = await response.text();
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    if (!parsed?.body) throw new Error('Page invalide.');

    document.title = parsed.title || document.title;
    document.body.className = parsed.body.className;
    document.body.innerHTML = parsed.body.innerHTML;

    if (pushState) {
      window.history.pushState({}, '', targetUrl.href);
    }
    window.scrollTo(0, 0);
    runBodyScripts();
  }

  document.addEventListener('click', async (event) => {
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target.closest('.topnav a, .brand a, a[data-nav-link]');
    if (!isEligibleLink(anchor)) return;
    event.preventDefault();
    try {
      await navigateTo(anchor.href, true);
    } catch (error) {
      console.error(error);
      window.location.href = anchor.href;
    }
  });

  window.addEventListener('popstate', async () => {
    try {
      await navigateTo(window.location.href, false);
    } catch (error) {
      console.error(error);
      window.location.reload();
    }
  });
}
