(function(){
  // Ensure mobile viewport meta exists
  (function ensureViewport(){
    try{
      const hasViewport = document.querySelector('meta[name="viewport"]');
      if(!hasViewport){
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1';
        document.head ? document.head.prepend(meta) : document.documentElement.prepend(meta);
      }
    }catch(e){ /* noop */ }
  })();

  // Wire up the header's Rename the tab button to prompt and set the tab title
  function bindHeaderRenameButton(){
    try{
      const hdr = document.getElementById('header');
      if(!hdr) return;
      const btn = hdr.querySelector('.rename-tab-btn');
      if(!btn) return;
      btn.onclick = function(){
        try{
          const current = document.title || '';
          const next = prompt('Enter a new tab title:', current);
          if (next && next.trim()) { document.title = next.trim(); }
        }catch(e){ /* ignore */ }
      };
    }catch(e){ /* ignore */ }
  }
  // Finds or creates a placeholder and injects header.html there
  async function injectHeader(){
    const existing = document.getElementById('header');
    const placeholder = existing || document.getElementById('header-placeholder') || (function(){
      const p = document.createElement('div'); p.id = 'header-placeholder';
      document.body.prepend(p); return p;
    })();
    try{
      const res = await fetch('header.html?cb=' + Date.now(), {cache:'no-cache'});
      if(!res.ok) throw new Error('header fetch failed: '+res.status);
      const html = await res.text();
      placeholder.outerHTML = html; // replace existing or placeholder with real header

  // After injection, auto-fit header link text to avoid truncation on small screens
      function fitHeaderText(){
        try{
          const hdr = document.getElementById('header');
          if(!hdr) return;
          const links = hdr.querySelectorAll('nav ul li a, nav ul > a.nav-button, nav ul > a.nav-button-logo');
          links.forEach(a => {
            // Reset font size first to computed value from CSS
            a.style.fontSize = '';
            const style = getComputedStyle(a);
            const initial = parseFloat(style.fontSize) || 16;
            const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) || 0;
            const maxW = (a.clientWidth || a.getBoundingClientRect().width);
            if(!maxW) return;
            const available = Math.max(0, maxW - Math.max(8, padX * 0.25));
            // Create a measuring span
            const span = document.createElement('span');
            span.style.visibility = 'hidden';
            span.style.whiteSpace = 'nowrap';
            span.style.position = 'absolute';
            span.style.left = '-9999px';
            span.textContent = a.textContent.trim();
            document.body.appendChild(span);
            let size = initial;
            const min = 8; // hard floor for readability
            while(size > min){
              span.style.font = style.font;
              span.style.fontSize = size + 'px';
              if(span.getBoundingClientRect().width <= available) break;
              size -= 0.5;
            }
            a.style.fontSize = size + 'px';
            span.remove();
          });
        }catch(e){ /* ignore fit errors */ }
      }

      // Run now and on resize/orientation changes
      fitHeaderText();
      let fitTimer;
      const onResize = () => { clearTimeout(fitTimer); fitTimer = setTimeout(fitHeaderText, 80); };
      window.addEventListener('resize', onResize);
      window.addEventListener('orientationchange', onResize);
      // After header is in the DOM, refresh news boxes if loader exposes a hook
      if (window.newsLoader && typeof window.newsLoader.refresh === 'function') {
        window.newsLoader.refresh();
      }
      // Bind rename button if present in header.html
      bindHeaderRenameButton();

      // Ensure minimal styles for the rename button even if main CSS misses
      try {
        const btn = document.querySelector('#header .rename-tab-btn');
        if (btn) {
          const cs = getComputedStyle(btn);
          // If styles are missing (e.g., default button border/background), inject minimal fallback
          if (!cs || cs.backgroundColor === 'rgba(0, 0, 0, 0)' || cs.backgroundColor === 'transparent') {
            const style = document.createElement('style');
            style.setAttribute('data-rename-fallback', 'true');
            style.textContent = '.rename-tab-btn{margin-left:auto;margin-right:5px;background:#f0e6da;color:#111;border:none;padding:6px 10px;border-radius:10px;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.2);line-height:1.1;display:inline-flex;align-items:center;justify-content:center} .rename-tab-btn:hover{background:#ffe9c9}';
            document.head.appendChild(style);
          }
        }
      } catch(e) { /* ignore */ }

      // As a fallback if header injection were to fail for some reason
    }catch(e){ console.warn('header-loader:', e); /* fallback skipped to avoid undefined refs */ }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectHeader);
  else injectHeader();
})();
