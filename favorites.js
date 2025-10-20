(function(){
  // Manage favorites using localStorage and support dynamically added nav buttons (custom games)
  const STORAGE_KEY = 'gbf_favorites_v1';
  const navBar = document.querySelector('.nav-bar');
  if (!navBar) return;

  // ensure favorites container exists
  let favoritesContainer = navBar.querySelector('.favorites-container');
  if (!favoritesContainer) {
    favoritesContainer = document.createElement('div');
    favoritesContainer.className = 'favorites-container';
    const header = document.createElement('div');
    header.className = 'favorites-header';
    header.textContent = 'Favorites';
    favoritesContainer.appendChild(header);
    const list = document.createElement('div');
    list.className = 'favorites-list';
    favoritesContainer.appendChild(list);
    navBar.appendChild(favoritesContainer);
  }

  const favoritesList = favoritesContainer.querySelector('.favorites-list');

  function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch(e){ return []; } }
  function save(list){ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

  let favorites = load();

  function getPrimaryButtons(){
    return Array.from(navBar.querySelectorAll('.nav-button')).filter(el=>
      !el.closest('.favorites-container') && !el.classList.contains('add-game-btn')
    );
  }

  function idForBtn(btn){
    // Prefer stable identifiers:
    // 1) href (if present)
    // 2) data-custom-game-id (used for custom games)
    // 3) fallback to trimmed text
    return btn.getAttribute('href') || btn.dataset.customGameId || btn.textContent.trim().slice(0,30);
  }

  function updateStarText(star){ star.textContent = star.classList.contains('active') ? '\u2605' : '\u2606'; }

  function attachStarToButton(btn){
    if (btn.querySelector('.fav-star')) return; // already attached
    btn.style.position = btn.style.position || 'relative';
    const star = document.createElement('button');
    star.className = 'fav-star';
    star.setAttribute('aria-label','Toggle favorite');
    const id = idForBtn(btn);
    star.dataset.id = id;
    if (favorites.includes(id)) star.classList.add('active');
    updateStarText(star);
    btn.appendChild(star);

    star.addEventListener('click', function(e){
      e.stopPropagation(); e.preventDefault();
      const id = this.dataset.id;
      if (favorites.includes(id)) {
        favorites = favorites.filter(x=>x!==id);
        this.classList.remove('active');
      } else {
        favorites.push(id);
        this.classList.add('active');
      }
      updateStarText(this);
      save(favorites);
      renderFavorites();
    });
  }

  // Attach stars to existing primary buttons
  getPrimaryButtons().forEach(attachStarToButton);

  // Observe nav for dynamically added buttons (custom games)
  const primaryWrap = navBar.querySelector('.nav-primary') || navBar;
  const mo = new MutationObserver(mutations => {
    for (const m of mutations){
      if (m.type === 'childList' && m.addedNodes.length){
        m.addedNodes.forEach(n => {
          if (!(n instanceof HTMLElement)) return;
          if (n.classList && n.classList.contains('nav-button')) attachStarToButton(n);
          n.querySelectorAll && n.querySelectorAll('.nav-button').forEach(attachStarToButton);
        });
      }
    }
  });
  mo.observe(primaryWrap, { childList: true, subtree: true });

  function renderFavorites(){
    // reload latest favorites from storage in case another code path modified it
    favorites = load();
    favoritesList.innerHTML = '';
    const primaryButtons = getPrimaryButtons();
    // Keep only valid favorites (that map to a primary button)
    const valid = [];
    favorites.forEach(fid=>{
      const src = primaryButtons.find(btn => idForBtn(btn) === fid || btn.href === fid || (fid && fid.endsWith(btn.getAttribute('href')||'')));
      if (!src) return; // skip stale
      valid.push(fid);
  const clone = src.cloneNode(true);
  // remove nested favorite controls and any remove buttons so favorites are read-only
  const nested = clone.querySelector('.fav-star'); if (nested) nested.remove();
  clone.querySelectorAll('.remove-custom-game, .nav-extra, .vote-controls, .vote-btn, .icon, .count').forEach(n => n.remove());
      clone.classList.add('favorite-item');
      clone.addEventListener('click', function(e){ const href = clone.getAttribute('href'); if (href) location.href = href; });
      favoritesList.appendChild(clone);
    });
    // Persist cleaned favorites if we removed stale entries
    if (JSON.stringify(valid) !== JSON.stringify(favorites)) {
      favorites = valid; save(favorites);
    }

    // If there are no favorites, show a subtle placeholder hint
    if (!valid.length) {
      const hint = document.createElement('div');
      hint.className = 'favorites-empty-hint';
      hint.textContent = 'Click on a star to favorite something';
      // minimal inline styles so it looks subtle without requiring CSS changes
      hint.style.background = '#e5e7eb';
      hint.style.color = '#6b7280';
      hint.style.padding = '8px 10px';
      hint.style.borderRadius = '6px';
      hint.style.fontSize = '13px';
      hint.style.textAlign = 'center';
      hint.style.margin = '6px';
      favoritesList.appendChild(hint);
    }
  }

  // Respond to external updates: other scripts can dispatch this event after changing favorites
  document.addEventListener('favorites-changed', renderFavorites);

  // Initial render
  renderFavorites();

})();
