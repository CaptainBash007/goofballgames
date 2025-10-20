/* custom-game.js - Handle custom game additions */
(function(){
  const STORAGE_KEY = 'gb_custom_games_v1';
  
  function init(){
    // Get modal elements
    const modal = document.getElementById('custom-game-modal');
    const addBtn = document.getElementById('add-game-btn');
    const closeBtn = modal?.querySelector('.modal-close');
    const saveBtn = document.getElementById('save-custom-game');
    const urlInput = document.getElementById('custom-game-url');
    const nameInput = document.getElementById('custom-game-name');

    if (!modal || !addBtn) return; // not on index or modal missing

  // Load custom games from localStorage
  function loadCustomGames() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch(e) {
      console.error('Error loading custom games:', e);
      return [];
    }
  }

  // Save custom games to localStorage
  function saveCustomGames(games) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
    } catch(e) {
      console.error('Error saving custom games:', e);
    }
  }

  // Show modal
  function showModal() {
    modal.style.display = 'flex';
    urlInput.value = '';
    nameInput.value = '';
    urlInput.focus();
  }

  // Hide modal
  function hideModal() {
    modal.style.display = 'none';
  }

  // Add custom game
  function addCustomGame() {
    let url = urlInput.value.trim();
    const name = nameInput.value.trim() || 'Custom Game';

    if (!url) {
      alert('Please enter a valid URL');
      return;
    }

    // If user omitted scheme, default to https://
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch(e) {
      alert('Please enter a valid URL (e.g., https://example.com)');
      return;
    }

    const games = loadCustomGames();
    const gameId = 'custom_' + Date.now();
    
    games.push({
      id: gameId,
      name: name,
  url: url,
      created: Date.now()
    });

    saveCustomGames(games);
    hideModal();

    // Redirect to the custom game page
    window.location.href = `custom-game.html?id=${gameId}`;
  }

  // Add custom game buttons to nav on index page
  function addCustomGameButtons() {
    const navBar = document.querySelector('.nav-bar .nav-primary');
    if (!navBar) return;

    const games = loadCustomGames();
    
    games.forEach(game => {
      // Check if button already exists
      if (document.querySelector(`[data-custom-game-id="${game.id}"]`)) return;

      const button = document.createElement('a');
  button.className = 'nav-button custom-game-button';
  button.setAttribute('data-no-votes','');
      button.href = `custom-game.html?id=${game.id}`;
      button.setAttribute('data-custom-game-id', game.id);
      button.innerHTML = `
        ${game.name}
  <button class="remove-custom-game" data-game-id="${game.id}" aria-label="Remove custom game" title="Remove game">×</button>
        <div class="nav-extra"><code></code></div>
      `;
      
      navBar.appendChild(button);
    });

    // Add remove functionality
    document.querySelectorAll('.remove-custom-game').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const gameId = this.getAttribute('data-game-id');
        if (confirm('Remove this custom game?')) {
          const games = loadCustomGames();
          const filtered = games.filter(g => g.id !== gameId);
          saveCustomGames(filtered);

          // Remove the button from DOM
          const button = document.querySelector(`[data-custom-game-id="${gameId}"]`);
          if (button) button.remove();

          // Also remove from favorites (if present) and notify favorites module
          try {
            const FAV_KEY = 'gbf_favorites_v1';
            const favData = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
            // Build the canonical href this custom game used in nav buttons
            const href = `custom-game.html?id=${gameId}`;
            // Build possible id forms: href, data-custom-game-id, and a custom_ prefix
            const possibleIds = [ href, gameId, `custom_${gameId}` ];
            const cleaned = favData.filter(id => !possibleIds.includes(id));
            localStorage.setItem(FAV_KEY, JSON.stringify(cleaned));
            // dispatch event so favorites UI can re-render
            document.dispatchEvent(new Event('favorites-changed'));
          } catch (e) {
            // ignore
          }
        }
      });
    });
  }

  // Event listeners
  addBtn.addEventListener('click', function(e) {
    e.preventDefault();
    showModal();
  });

  closeBtn.addEventListener('click', hideModal);

  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      hideModal();
    }
  });

  saveBtn.addEventListener('click', addCustomGame);

  urlInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      addCustomGame();
    }
  });

  nameInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      addCustomGame();
    }
  });

  // Close modal on Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
      hideModal();
    }
  });

  // Add custom game buttons if on index page
  if (document.querySelector('.nav-bar .nav-primary')) {
    // Wait a bit for nav-vote.js and favorites.js to finish
    setTimeout(addCustomGameButtons, 100);
  }

  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
