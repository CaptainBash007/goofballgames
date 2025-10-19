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

  // Ensure primary stylesheet is applied across all pages (Chromebook/GitHub Pages cache quirks)
  (function ensureSiteCss(){
    try{
      function cssLoaded(){
        var cs = getComputedStyle(document.documentElement).getPropertyValue('--gg-css-loaded');
        return cs && cs.trim() === '1';
      }
      function getMainLink(){
        const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
        return links.find(l => (l.href||'').includes('styles.css')) || null;
      }
      function bust(link){
        const base = (link.getAttribute('href') || link.href || 'styles.css').split('?')[0];
        const next = base + '?v=' + Date.now();
        link.setAttribute('href', next);
      }
      function injectMain(){
        const l = document.createElement('link');
        l.rel = 'stylesheet'; l.type = 'text/css'; l.href = 'styles.css?v=' + Date.now();
        document.head.appendChild(l); return l;
      }
      function injectFallback(){
        if (document.querySelector('style[data-css-fallback]')) return;
        const s = document.createElement('style');
        s.setAttribute('data-css-fallback','true');
        s.textContent = `
          .rename-tab-btn{ margin-left:auto; margin-right:5px; background:#f0e6da; color:#111; border:none; padding:6px 10px; border-radius:10px; font-weight:700; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.2); }
          .rename-tab-btn:hover{ background:#ffe9c9; }
          .tab-rename-modal{ position:fixed; inset:0; background:rgba(0,0,0,0.45); display:none; align-items:center; justify-content:center; z-index:99999; }
          .tab-rename-modal.open{ display:flex; }
          .tab-rename-modal .trm-content{ width:min(92vw,440px); background:#fff; border-radius:12px; box-shadow:0 12px 32px rgba(0,0,0,0.35); padding:16px; color:#111; }
          .tab-rename-modal .trm-actions{ margin-top:12px; display:flex; gap:8px; justify-content:flex-end; }
          .tab-rename-modal .trm-save{ background:#821510; color:#fff; }
          .tab-rename-modal .trm-reset{ background:#e0e0e0; color:#111; }
          .tab-rename-modal .trm-cancel{ background:#f5f5f5; color:#111; }
        `;
        document.head.appendChild(s);
      }
      function tryEnsure(){
        if (!cssLoaded()){
          let link = getMainLink();
          if (!link) link = injectMain(); else bust(link);
          setTimeout(function(){ if (!cssLoaded()) injectFallback(); }, 400);
        }
        // After CSS likely applied, ensure Rename UI bindings are present
        setTimeout(function(){ try { ensureRenameUI(); } catch(e){} }, 450);
      }
      // Run now, after DOMContentLoaded, and after window load for stubborn caching
      tryEnsure();
      document.addEventListener('DOMContentLoaded', tryEnsure, { once: true });
      window.addEventListener('load', tryEnsure, { once: true });
    }catch(e){ /* ignore CSS ensure errors */ }
  })();
  
  // Tab rename helpers (work even if header injection fails, e.g., file://)
  const TAB_STORAGE_KEY = 'gb_tab_custom_v1';
  const DEFAULT_TITLE = 'Untitled document - Google Docs';
  const DEFAULT_FAVICON = 'https://ssl.gstatic.com/docs/documents/images/kix-favicon-2023q4.ico';
  function loadTabCfg(){ try { return JSON.parse(localStorage.getItem(TAB_STORAGE_KEY)) || null; } catch(e){ return null; } }
  function saveTabCfg(cfg){ try { localStorage.setItem(TAB_STORAGE_KEY, JSON.stringify(cfg||{})); } catch(e){} }
  function applyTabSettings(cfg){
    if (!cfg) return;
    if (cfg.title) { try { document.title = cfg.title; } catch(e){} }
    if (cfg.favicon) {
      try {
        let link = document.querySelector('link[rel~="icon"]') || document.querySelector('link[rel="shortcut icon"]');
        if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
        // Remember original href once for reset
        if (!link.getAttribute('data-default-href')) {
          const current = link.getAttribute('href') || '';
          link.setAttribute('data-default-href', current);
        }
        link.href = cfg.favicon;
      } catch(e){}
    }
  }
  function applyDefaultTitleAndFavicon(){
    try {
      // Title
      document.title = DEFAULT_TITLE;
      // Favicon
      let link = document.querySelector('link[rel~="icon"]') || document.querySelector('link[rel="shortcut icon"]');
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
      link.href = DEFAULT_FAVICON;
    } catch(e){}
  }
  function normalizeUrl(u){
    u = (u||'').trim();
    if (!u) return '';
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    try { new URL(u); return u; } catch(e){ return ''; }
  }
  function ensureDefaultsIfNoCustom(){
    const cfg = loadTabCfg();
    const hasCustom = !!(cfg && (cfg.title || cfg.favicon));
    if (!hasCustom) {
      applyDefaultTitleAndFavicon();
      // Also re-apply on window load to override any late title changes by page scripts
      window.addEventListener('load', () => {
        const cfg2 = loadTabCfg();
        const stillNoCustom = !(cfg2 && (cfg2.title || cfg2.favicon));
        if (stillNoCustom) applyDefaultTitleAndFavicon();
      }, { once: true });
    }
  }
  function ensureRenameUI(){
    // Always ensure the button and modal exist and listeners are bound (idempotent)

    // Ensure button exists (prefer header right-half)
    let btn = document.querySelector('.rename-tab-btn');
    if (!btn){
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rename-tab-btn';
      btn.title = 'Rename the tab';
      btn.textContent = 'Rename the tab';
      const right = document.querySelector('#header .right-half');
      if (right) right.appendChild(btn);
      else {
        // Fallback position if no header present (file:// without injection)
        btn.style.position = 'fixed';
        btn.style.top = '10px';
        btn.style.right = '5px';
        btn.style.zIndex = '10000';
        document.body.appendChild(btn);
      }
    }

    // Ensure modal exists
    let modal = document.querySelector('.tab-rename-modal');
    if (!modal){
      modal = document.createElement('div');
      modal.className = 'tab-rename-modal';
      modal.innerHTML = `
        <div class="trm-content" role="dialog" aria-modal="true" aria-labelledby="trm-title">
          <h3 id="trm-title">Rename the tab</h3>
          <label>Tab title<br><input type="text" class="trm-title-input" placeholder="My Cool Tab"></label>
          <label style="margin-top:8px; display:block;">Favicon image URL<br><input type="url" class="trm-favicon-input" placeholder="https://example.com/icon.png"></label>
          <div class="trm-actions">
             <button type="button" class="trm-save">Save</button>
             <button type="button" class="trm-reset">Reset</button>
             <button type="button" class="trm-cancel">Cancel</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
    }

  let titleInput = modal.querySelector('.trm-title-input');
  let favInput = modal.querySelector('.trm-favicon-input');
  let saveBtn = modal.querySelector('.trm-save');
  let resetBtn = modal.querySelector('.trm-reset');
  let cancelBtn = modal.querySelector('.trm-cancel');

    function open(){
      const cfg = loadTabCfg() || {};
      titleInput.value = cfg.title || '';
      favInput.value = cfg.favicon || '';
      modal.classList.add('open');
      setTimeout(()=> titleInput.focus(), 0);
    }
    function close(){ modal.classList.remove('open'); }

    // Expose open/close so a delegated handler can call them even if nodes are replaced later
    try { window.__gbOpenRenameModal = open; window.__gbCloseRenameModal = close; } catch(e){}

  // Remove duplicate listeners before adding (idempotent binding)
  try { const clone = btn.cloneNode(true); btn.parentNode.replaceChild(clone, btn); btn = clone; } catch(e){}
  btn.addEventListener('click', open);
  cancelBtn.addEventListener('click', close);
  modal.addEventListener('click', (e)=>{ if (e.target === modal) close(); });
  modal.addEventListener('keydown', (e)=>{ if (e.key==='Escape') close(); });

    saveBtn.addEventListener('click', ()=>{
      const title = titleInput.value.trim();
      const fav = normalizeUrl(favInput.value);
      const cfg = { title, favicon: fav };
      saveTabCfg(cfg);
      applyTabSettings(cfg);
      close();
    });

    resetBtn.addEventListener('click', ()=>{
      saveTabCfg({});
      // Restore to global defaults and normalize favicon element
      try {
        applyDefaultTitleAndFavicon();
        let link = document.querySelector('link[rel~="icon"], link[rel="shortcut icon"]');
        if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
        link.href = DEFAULT_FAVICON;
      } catch(e){}
      close();
    });

    // One-time delegated click handler to ensure the button works even if the DOM is replaced later
    if (!document.__gbRenameDelegated){
      document.addEventListener('click', function(e){
        const trigger = e.target && e.target.closest && e.target.closest('.rename-tab-btn');
        if (trigger){
          e.preventDefault();
          try {
            if (typeof window.__gbOpenRenameModal !== 'function') ensureRenameUI();
            if (typeof window.__gbOpenRenameModal === 'function') window.__gbOpenRenameModal();
          } catch(err){}
        }
      });
      document.__gbRenameDelegated = true;
    }
  }

  // Apply saved settings ASAP (works on file://)
  applyTabSettings(loadTabCfg());
  // Re-apply once page fully loaded to override late title changes by other scripts
  window.addEventListener('load', function(){
    try { applyTabSettings(loadTabCfg()); } catch(e){}
  });
  // Apply Google Docs-style defaults if no custom rename exists
  ensureDefaultsIfNoCustom();
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

  // Ensure Rename Tab UI after successful injection (and after styles load)
  ensureRenameUI();
  setTimeout(ensureRenameUI, 200);

      // Add Rename Tab modal behavior
      (function setupRenameTab(){
        const STORAGE_KEY = 'gb_tab_custom_v1';

        function applyTabSettings(cfg){
          if (!cfg) return;
          if (cfg.title) { try { document.title = cfg.title; } catch(e){} }
          if (cfg.favicon) {
            try {
              let link = document.querySelector('link[rel~="icon"]') || document.querySelector('link[rel="shortcut icon"]');
              if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
              // Remember original href once for reset
              if (!link.getAttribute('data-default-href')) {
                const current = link.getAttribute('href') || '';
                link.setAttribute('data-default-href', current);
              }
              link.href = cfg.favicon;
            } catch(e){}
          }
        }

        function loadCfg(){
          try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch(e){ return null; }
        }
        function saveCfg(cfg){
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg||{})); } catch(e){}
        }

        // Apply existing settings immediately
        applyTabSettings(loadCfg());

        const btn = document.querySelector('.rename-tab-btn');
        if (!btn) return;

        // Create modal lazily
        let modal = document.querySelector('.tab-rename-modal');
        if (!modal){
          modal = document.createElement('div');
          modal.className = 'tab-rename-modal';
          modal.innerHTML = `
            <div class="trm-content" role="dialog" aria-modal="true" aria-labelledby="trm-title">
              <h3 id="trm-title">Rename the tab</h3>
              <label>Tab title<br><input type="text" class="trm-title-input" placeholder="My Cool Tab"></label>
              <label style="margin-top:8px; display:block;">Favicon image URL<br><input type="url" class="trm-favicon-input" placeholder="https://example.com/icon.png"></label>
              <div class="trm-actions">
                 <button type="button" class="trm-save">Save</button>
                 <button type="button" class="trm-reset">Reset</button>
                 <button type="button" class="trm-cancel">Cancel</button>
              </div>
            </div>`;
          document.body.appendChild(modal);
        }

        const titleInput = modal.querySelector('.trm-title-input');
        const favInput = modal.querySelector('.trm-favicon-input');
        const saveBtn = modal.querySelector('.trm-save');
        const resetBtn = modal.querySelector('.trm-reset');
        const cancelBtn = modal.querySelector('.trm-cancel');

        function open(){
          const cfg = loadCfg() || {};
          titleInput.value = cfg.title || '';
          favInput.value = cfg.favicon || '';
          modal.classList.add('open');
          setTimeout(()=> titleInput.focus(), 0);
        }
        function close(){ modal.classList.remove('open'); }

        function normalizeUrl(u){
          u = (u||'').trim();
          if (!u) return '';
          if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
          try { new URL(u); return u; } catch(e){ return ''; }
        }

        btn.addEventListener('click', open);
        cancelBtn.addEventListener('click', close);
        modal.addEventListener('click', (e)=>{ if (e.target === modal) close(); });
        modal.addEventListener('keydown', (e)=>{ if (e.key==='Escape') close(); });

        saveBtn.addEventListener('click', ()=>{
          const title = titleInput.value.trim();
          const fav = normalizeUrl(favInput.value);
          const cfg = { title, favicon: fav };
          saveCfg(cfg);
          applyTabSettings(cfg);
          close();
        });

        resetBtn.addEventListener('click', ()=>{
          saveCfg({});
          // Restore to global defaults
          try { document.title = DEFAULT_TITLE; } catch(e){}
          try {
            let link = document.querySelector('link[rel~="icon"], link[rel="shortcut icon"]');
            if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
            link.href = DEFAULT_FAVICON;
          } catch(e){}
          close();
        });
      })();
    }catch(e){ console.warn('header-loader:', e); ensureRenameUI(); }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectHeader);
  else injectHeader();
})();
