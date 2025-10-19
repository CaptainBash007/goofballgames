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

  // Minimal "Rename tab" helper button: shows instructions to use ?t= in the URL
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
      btn.onclick = function(){ showRenameInstruction(); };
    }catch(e){ /* ignore */ }
  }
  function showRenameInstruction(){
    var msg = [
      'How to rename this tab:',
      '',
      '1) In the address bar, add ?t=Your+Title to the end of the page URL.',
      "2) Use plus signs (+) for spaces. Example:",
      '   ?t=Math+Practice',
      '',
      'Tip: You can bookmark the URL with the ?t=... so it stays named next time.'
    ].join('\n');
    try { alert(msg); }
    catch(e){ /* as a last resort, write to console */ try{ console.log(msg); }catch(_){} }
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
    }catch(e){ console.warn('header-loader:', e); /* fallback skipped to avoid undefined refs */ }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectHeader);
  else injectHeader();
})();
