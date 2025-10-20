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

  // find primary buttons inside nav-bar (exclude favorites container and the "Add your own game" button)
  const primaryButtons = Array.from(navBar.querySelectorAll('.nav-button')).filter(el=>
    !el.closest('.favorites-container') && !el.classList.contains('add-game-btn')
  );

  function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch(e){ return []; }
  }
  function save(list){ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }

  let favorites = load();

  function idForBtn(btn, i){
    // create an id based on href + index fallback
    return btn.getAttribute('href') || btn.textContent.trim().slice(0,30) + '::' + i;
  }

  // add star toggles to each primary button
  primaryButtons.forEach((btn, i)=>{
    btn.style.position = btn.style.position || 'relative';
    const star = document.createElement('button');
  star.className = 'fav-star';
  star.setAttribute('aria-label','Toggle favorite');
  const id = idForBtn(btn,i);
  star.dataset.id = id;
  if (favorites.includes(id)) star.classList.add('active');
  // Use Unicode star characters for compatibility (☆ empty, ★ filled)
  function updateStarText(){ star.textContent = star.classList.contains('active') ? '★' : '☆'; }
  updateStarText();
    // position top-right
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
      updateStarText();
      save(favorites);
      renderFavorites();
    });
  });

  function renderFavorites(){
    favoritesList.innerHTML = '';
    // for each favorite id, find the corresponding primary button
    favorites.forEach(fid=>{
      const src = primaryButtons.find((btn,i)=> idForBtn(btn,i) === fid);
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

})();
