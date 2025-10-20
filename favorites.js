(function(){
  // Manage favorites using localStorage (cookies would work too; localStorage is simpler)
  const STORAGE_KEY = 'gbf_favorites_v1';
  const navBar = document.querySelector('.nav-bar');
  if (!navBar) return;

  // create favorites container at bottom of nav-bar
  const favoritesContainer = document.createElement('div');
  favoritesContainer.className = 'favorites-container';
  const favoritesHeader = document.createElement('div');
  favoritesHeader.className = 'favorites-header';
  favoritesHeader.textContent = 'Favorites';
  favoritesContainer.appendChild(favoritesHeader);
  const favoritesList = document.createElement('div');
  favoritesList.className = 'favorites-list';
  favoritesContainer.appendChild(favoritesList);
  navBar.appendChild(favoritesContainer);

  function getPrimaryButtons(){
    return Array.from(navBar.querySelectorAll('.nav-button')).filter(el=>
      !el.closest('.favorites-container') && !el.classList.contains('add-game-btn')
    );
  }

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch(e){ return []; }
  }
  function save(list){ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

  let favorites = load();

  function idForBtn(btn, i){
    // create an id based on href + index fallback
    return btn.getAttribute('href') || btn.textContent.trim().slice(0,30) + '::' + i;
  }

  function ensureStar(btn){
    if (!btn || btn.classList.contains('add-game-btn')) return;
    if (btn.querySelector('.fav-star')) return; // already has star
    const i = 0; // index not needed when href exists
    btn.style.position = btn.style.position || 'relative';
    const star = document.createElement('button');
    star.className = 'fav-star';
    star.setAttribute('aria-label','Toggle favorite');
    const id = idForBtn(btn,i);
    star.dataset.id = id;
    if (favorites.includes(id)) star.classList.add('active');
    function updateStarText(){ star.textContent = star.classList.contains('active') ? '★' : '☆'; }
    updateStarText();
    btn.appendChild(star);
    star.addEventListener('click', function(e){
      e.stopPropagation(); e.preventDefault();
      const fid = this.dataset.id;
      if (favorites.includes(fid)) {
        favorites = favorites.filter(x=>x!==fid);
        this.classList.remove('active');
      } else {
        favorites.push(fid);
        this.classList.add('active');
      }
      updateStarText();
      save(favorites);
      renderFavorites();
    });
  }

  // add stars to current buttons
  getPrimaryButtons().forEach(btn=> ensureStar(btn));

  // Observe future buttons (e.g., custom games) and add stars automatically
  const primary = document.querySelector('.nav-bar .nav-primary') || navBar;
  if (primary && 'MutationObserver' in window){
    const mo = new MutationObserver((mut)=>{
      mut.forEach(m=>{
        m.addedNodes && m.addedNodes.forEach(n=>{
          if (n.nodeType===1){
            if (n.classList.contains('nav-button')) ensureStar(n);
            // if container node, scan descendants
            n.querySelectorAll && n.querySelectorAll('.nav-button').forEach(ensureStar);
          }
        });
      });
    });
    mo.observe(primary, { childList: true, subtree: true });
  }

  function renderFavorites(){
    favoritesList.innerHTML = '';
    // for each favorite id, find the corresponding primary button
    const buttonsNow = getPrimaryButtons();
    favorites.forEach(fid=>{
      const src = buttonsNow.find((btn,i)=> idForBtn(btn,i) === fid);
      if (!src) return; // ignore stale ids
      const clone = src.cloneNode(true);
      // remove nested fav star in clone
      const nested = clone.querySelector('.fav-star'); if (nested) nested.remove();
      // strip any hover-extra content or vote controls so favorites stay clean
      clone.querySelectorAll('.nav-extra, .vote-controls, .vote-btn, .icon, .count').forEach(n => n.remove());
      clone.classList.add('favorite-item');
      // ensure clicking clone navigates
      clone.addEventListener('click', function(e){
        const href = clone.getAttribute('href'); if (href) location.href = href;
      });
      favoritesList.appendChild(clone);
    });
  }

  // initial render
  renderFavorites();

  // Allow external triggers to remove/refresh favorites (used by custom-game removal)
  window.addEventListener('gb:favorites:remove', (e)=>{
    const id = e && e.detail && e.detail.id; if (!id) return;
    favorites = favorites.filter(x=>x!==id);
    save(favorites);
    renderFavorites();
    // Also unmark star if the button still exists
    const btn = getPrimaryButtons().find((b,i)=> idForBtn(b,i) === id);
    const star = btn && btn.querySelector && btn.querySelector('.fav-star');
    if (star) { star.classList.remove('active'); star.textContent = '☆'; }
  });
  window.addEventListener('gb:favorites:refresh', ()=> renderFavorites());

})();
