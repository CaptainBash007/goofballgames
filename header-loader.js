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

  // New, simple Rename Tab: a small button inside the header, 8px from the right edge.
  const SIMPLE_TITLE_KEY = 'gb_simple_title_v1';
  function safeGet(k){
    try { return localStorage.getItem(k) || sessionStorage.getItem(k) || ''; } catch(e){
      try { return sessionStorage.getItem(k) || ''; } catch(e2){ return ''; }
    }
  }
  function safeSet(k,v){
    try { localStorage.setItem(k, v); return true; } catch(e){
      try { sessionStorage.setItem(k, v); return true; } catch(e2){ return false; }
    }
  }
  function getSimpleTitle(){ return safeGet(SIMPLE_TITLE_KEY); }
  function setSimpleTitle(t){ safeSet(SIMPLE_TITLE_KEY, t || ''); }
  (function applySavedSimpleTitle(){
    const t = getSimpleTitle(); if (t) { try { document.title = t; } catch(e){} }
  })();
  function installSimpleRenameButton(){
    try{
      const header = document.getElementById('header');
      let btn;
      if (header){
        // Ensure header is positioning context
        if (getComputedStyle(header).position === 'static') header.style.position = 'relative';
        btn = header.querySelector('.gb-simple-rename');
        if (!btn){
          btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'gb-simple-rename';
          btn.textContent = 'Rename tab';
          // Anchored inside header, 8px from right
          btn.style.position = 'absolute';
          btn.style.right = '8px';
          btn.style.top = '50%';
          btn.style.transform = 'translateY(-50%)';
          header.appendChild(btn);
        }
        // Minimal required styles (user said style not important, but keep readability)
        btn.style.padding = '6px 10px'; btn.style.border = 'none'; btn.style.borderRadius = '10px';
        btn.style.background = '#f0e6da'; btn.style.color = '#111'; btn.style.fontWeight = '700';
        btn.style.cursor = 'pointer'; btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
      } else {
        // Fallback: fixed button on the page if header is missing or delayed
        btn = document.querySelector('body > .gb-simple-rename');
        if (!btn){
          btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'gb-simple-rename';
          btn.textContent = 'Rename tab';
          btn.style.position = 'fixed';
          btn.style.top = '8px';
          btn.style.right = '8px';
          btn.style.zIndex = '10000';
          document.body.appendChild(btn);
        }
        // Minimal styles
        btn.style.padding = '6px 10px'; btn.style.border = 'none'; btn.style.borderRadius = '10px';
        btn.style.background = '#f0e6da'; btn.style.color = '#111'; btn.style.fontWeight = '700';
        btn.style.cursor = 'pointer'; btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
      }
      // Bind click (idempotent)
      btn.onclick = function(){
        handleRenameClick();
      };
    }catch(e){ /* ignore */ }
  }

  function applyTitleAndPersist(t){
    if (!t) return;
    const title = String(t).trim(); if (!title) return;
    setSimpleTitle(title);
    try { document.title = title; } catch(e){}
  }

  function handleRenameClick(){
    const current = getSimpleTitle() || document.title || '';
    let next = '';
    try {
      next = prompt('Enter a new tab title:', current) || '';
    } catch(e) {
      next = '';
    }
    if (next && next.trim()) { applyTitleAndPersist(next); return; }
    // If prompt was blocked or user canceled, show a tiny inline overlay as a safe fallback
    showInlineRenameOverlay(current);
  }

  function showInlineRenameOverlay(current){
    try{
      // Avoid duplicates
      if (document.querySelector('.gb-rename-overlay')) return;
      const overlay = document.createElement('div');
      overlay.className = 'gb-rename-overlay';
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.background = 'rgba(0,0,0,0.35)';
      overlay.style.zIndex = '100000';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';

      const panel = document.createElement('div');
      panel.style.background = '#fff';
      panel.style.color = '#111';
      panel.style.borderRadius = '12px';
      panel.style.boxShadow = '0 12px 32px rgba(0,0,0,0.35)';
      panel.style.padding = '14px';
      panel.style.minWidth = '260px';
      panel.style.maxWidth = '90vw';

      const label = document.createElement('div');
      label.textContent = 'New tab title:';
      label.style.marginBottom = '8px';

      const input = document.createElement('input');
      input.type = 'text';
      input.value = current || '';
      input.style.width = '100%';
      input.style.boxSizing = 'border-box';
      input.style.padding = '8px 10px';
      input.style.border = '1px solid #ddd';
      input.style.borderRadius = '8px';

      const actions = document.createElement('div');
      actions.style.marginTop = '10px';
      actions.style.display = 'flex';
      actions.style.gap = '8px';
      actions.style.justifyContent = 'flex-end';

      const save = document.createElement('button');
      save.type = 'button';
      save.textContent = 'Save';
      save.style.background = '#821510';
      save.style.color = '#fff';
      save.style.border = 'none';
      save.style.borderRadius = '8px';
      save.style.padding = '8px 12px';
      save.style.cursor = 'pointer';

      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.textContent = 'Cancel';
      cancel.style.background = '#f0f0f0';
      cancel.style.color = '#111';
      cancel.style.border = 'none';
      cancel.style.borderRadius = '8px';
      cancel.style.padding = '8px 12px';
      cancel.style.cursor = 'pointer';

      actions.appendChild(cancel);
      actions.appendChild(save);
      panel.appendChild(label);
      panel.appendChild(input);
      panel.appendChild(actions);
      overlay.appendChild(panel);
      document.body.appendChild(overlay);

      const close = () => { try { overlay.remove(); } catch(e){} };
      cancel.onclick = close;
      overlay.addEventListener('click', (e)=>{ if (e.target === overlay) close(); });
      panel.addEventListener('keydown', (e)=>{ if (e.key==='Escape') close(); });
      save.onclick = () => { const val = (input.value||'').trim(); if (val) applyTitleAndPersist(val); close(); };
      setTimeout(()=> input.focus(), 0);
    }catch(e){ /* ignore overlay errors */ }
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
      // Install the simple rename button in the header
      installSimpleRenameButton();

      // As a fallback if header injection were to fail for some reason
    }catch(e){ console.warn('header-loader:', e); ensureRenameUI(); }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectHeader);
  else injectHeader();
})();
