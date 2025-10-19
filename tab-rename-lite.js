(function(){ /* deprecated: no-op */ return;
  var KEY = 'gb_simple_title_v1';
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

  function applySaved(){
    var t = safeGet(KEY);
    if (t) { try { document.title = t; } catch(e){} }
  }

  function applyTitleAndPersist(val){
    if (!val) return;
    var t = String(val).trim(); if (!t) return;
    safeSet(KEY, t);
    try { document.title = t; } catch(e){}
  }

  function showOverlay(current){
    try {
      if (document.querySelector('.gb-rename-overlay')) return;
      var overlay = document.createElement('div');
      overlay.className = 'gb-rename-overlay';
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.background = 'rgba(0,0,0,0.35)';
      overlay.style.zIndex = '100000';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';

      var panel = document.createElement('div');
      panel.style.background = '#fff';
      panel.style.color = '#111';
      panel.style.borderRadius = '12px';
      panel.style.boxShadow = '0 12px 32px rgba(0,0,0,0.35)';
      panel.style.padding = '14px';
      panel.style.minWidth = '260px';
      panel.style.maxWidth = '90vw';

      var label = document.createElement('div');
      label.textContent = 'New tab title:';
      label.style.marginBottom = '8px';

      var input = document.createElement('input');
      input.type = 'text';
      input.value = current || '';
      input.style.width = '100%';
      input.style.boxSizing = 'border-box';
      input.style.padding = '8px 10px';
      input.style.border = '1px solid #ddd';
      input.style.borderRadius = '8px';

      var actions = document.createElement('div');
      actions.style.marginTop = '10px';
      actions.style.display = 'flex';
      actions.style.gap = '8px';
      actions.style.justifyContent = 'flex-end';

      var save = document.createElement('button');
      save.type = 'button'; save.textContent = 'Save';
      save.style.background = '#821510'; save.style.color = '#fff';
      save.style.border = 'none'; save.style.borderRadius = '8px';
      save.style.padding = '8px 12px'; save.style.cursor = 'pointer';

      var cancel = document.createElement('button');
      cancel.type = 'button'; cancel.textContent = 'Cancel';
      cancel.style.background = '#f0f0f0'; cancel.style.color = '#111';
      cancel.style.border = 'none'; cancel.style.borderRadius = '8px';
      cancel.style.padding = '8px 12px'; cancel.style.cursor = 'pointer';

      actions.appendChild(cancel); actions.appendChild(save);
      panel.appendChild(label); panel.appendChild(input); panel.appendChild(actions);
      overlay.appendChild(panel);
      document.body.appendChild(overlay);

      function close(){ try { overlay.remove(); } catch(e){} }
      cancel.onclick = close;
      overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
      panel.addEventListener('keydown', function(e){ if (e.key === 'Escape') close(); });
      save.onclick = function(){ var v = (input.value||'').trim(); if (v) applyTitleAndPersist(v); close(); };
      setTimeout(function(){ try { input.focus(); input.select(); } catch(e){} }, 0);
    } catch(e) { /* ignore */ }
  }

  function handleClick(){
    var current = safeGet(KEY) || document.title || '';
    var next = '';
    try { next = prompt('Enter a new tab title:', current) || ''; } catch(e){ next = ''; }
    if (next && String(next).trim()) { applyTitleAndPersist(next); return; }
    showOverlay(current);
  }

  function ensureButton(){
    try {
      var header = document.getElementById('header');
      var btn;
      if (header){
        if (getComputedStyle(header).position === 'static') header.style.position = 'relative';
        btn = header.querySelector('.gb-simple-rename');
        if (!btn){
          btn = document.createElement('button');
          btn.type = 'button'; btn.className = 'gb-simple-rename'; btn.textContent = 'Rename tab';
          btn.style.position = 'absolute'; btn.style.right = '8px'; btn.style.top = '50%';
          btn.style.transform = 'translateY(-50%)';
          header.appendChild(btn);
        }
      } else {
        btn = document.querySelector('body > .gb-simple-rename');
        if (!btn){
          btn = document.createElement('button'); btn.type = 'button'; btn.className = 'gb-simple-rename'; btn.textContent = 'Rename tab';
          btn.style.position = 'fixed'; btn.style.top = '8px'; btn.style.right = '8px'; btn.style.zIndex = '10000';
          document.body.appendChild(btn);
        }
      }
      // Minimal usability styles
      btn.style.padding = '6px 10px'; btn.style.border = 'none'; btn.style.borderRadius = '10px';
      btn.style.background = '#f0e6da'; btn.style.color = '#111'; btn.style.fontWeight = '700';
      btn.style.cursor = 'pointer'; btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
      btn.onclick = handleClick;
    } catch(e) { /* ignore */ }
  }

  // Apply saved title quickly, then install button
  applySaved();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureButton, { once: true });
  else ensureButton();
  window.addEventListener('load', applySaved, { once: true });
})();
