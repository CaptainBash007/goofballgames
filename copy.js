(function(){
  const wrap = document.getElementById('bookmark-wrap');
  const toast = document.getElementById('copy-toast');
  if (!wrap) return;
  async function doCopy(){
    const link = wrap.getAttribute('data-link') || document.getElementById('bookmark-link')?.textContent || location.href;
    try {
      await navigator.clipboard.writeText(link);
      toast.classList.add('visible');
      setTimeout(()=> toast.classList.remove('visible'), 1600);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = link; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast.classList.add('visible'); setTimeout(()=> toast.classList.remove('visible'),1600);}catch(e){}
      ta.remove();
    }
  }
  wrap.addEventListener('click', doCopy);
  wrap.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doCopy(); } });
})();
