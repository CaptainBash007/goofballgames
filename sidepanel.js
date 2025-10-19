/* Side panel toggle and iframe sizing script */
(function(){
  const wrapper = document.getElementById('side-panel-wrapper');
  if (!wrapper) return;
  const tab = wrapper.querySelector('.side-tab');
  const drawer = wrapper.querySelector('.side-drawer');
  const iframe = wrapper.querySelector('.side-iframe');
  const closeBtn = wrapper.querySelector('.side-close');

  function openPanel() {
    wrapper.classList.add('open');
    drawer.setAttribute('aria-hidden','false');
    tab.setAttribute('aria-expanded','true');
  }

  function setIframeSize(w,h){
    // clamp and apply: the drawer will pad by 24px total (12 each side)
    const maxW = Math.min(window.innerWidth * 0.92, w || 640);
    const maxH = Math.min(window.innerHeight * 0.86, h || 400);
    iframe.style.width = Math.max(200, Math.round(maxW)) + 'px';
    iframe.style.height = Math.max(120, Math.round(maxH)) + 'px';
    // ensure drawer width equals iframe + padding
    const dw = (iframe.offsetWidth + 24);
    drawer.style.width = dw + 'px';
    // expose drawer width as a CSS variable so the tab can move along with it
    wrapper.style.setProperty('--drawer-w', drawer.style.width);
  }

  tab.addEventListener('click', function(){
    const src = tab.dataset.src;
    const w = parseInt(tab.dataset.width,10) || 640;
    const h = parseInt(tab.dataset.height,10) || 400;
    if (wrapper.classList.contains('open')){
      closePanel();
      return;
    }
    if (src){
      iframe.src = src;
    }
  // set size and open
  setIframeSize(w,h);
  openPanel();

    // try to read intrinsic size from same-origin iframe after load
    iframe.addEventListener('load', function tryResize(){
      try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        const body = doc.body;
        if (body){
          const bb = body.getBoundingClientRect();
          // add small padding
          setIframeSize(Math.ceil(bb.width)+48, Math.ceil(bb.height)+48);
        }
      } catch (e) {
        // cross-origin: ignore and keep requested size
      }
      // remove this handler to avoid repeated runs
      iframe.removeEventListener('load', tryResize);
    });
  });

  closeBtn.addEventListener('click', function(){ closePanel(); });

  // close when clicking outside
  document.addEventListener('click', function(e){
    if (!wrapper.classList.contains('open')) return;
    if (!wrapper.contains(e.target)) closePanel();
  });

  // keyboard: Escape to close
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closePanel(); });

  // Updated close behavior: animate the drawer and tab using the --drawer-w var,
  // then remove the open class after the transition finishes so tab moves with the drawer.
  function closePanel(){
    // set drawer target width to 0 so CSS transitions animate width
    try {
      drawer.style.width = '0px';
    } catch (e) {}
    // also move the tab by updating the CSS variable
    wrapper.style.setProperty('--drawer-w','0px');

    const cleanup = function(){
      wrapper.classList.remove('open');
      drawer.setAttribute('aria-hidden','true');
      tab.setAttribute('aria-expanded','false');
      // clear inline width so next open can set it naturally
      drawer.style.width = '';
    };

    // wait for transitionend but also provide a timeout fallback
    let called = false;
    const onEnd = function(e){
      if (e.target !== drawer) return;
      if (e.propertyName !== 'width' && e.propertyName !== 'transform') return;
      if (called) return; called = true;
      drawer.removeEventListener('transitionend', onEnd);
      cleanup();
    };
    drawer.addEventListener('transitionend', onEnd);
    // fallback in case transitionend doesn't fire
    setTimeout(()=>{ if (!called) { called=true; drawer.removeEventListener('transitionend', onEnd); cleanup(); } }, 420);
  }

  // initialize: if there is a data-src on body or meta, allow quick set
  // optional: the site can set .side-tab.dataset.src dynamically before clicking
})();
