(function(){
  // Voting backends, in priority order:
  // 1) Remote API (Cloudflare Worker) if API_BASE is set
  // 2) LocalStorage fallback
  const API_BASE = '';
  const USE_REMOTE = !!API_BASE;

  const LOCAL_KEY = 'gb_nav_votes_v1';

  // Stable anonymous id to limit one vote per user per item on the backend
  function getUserId(){
    const KEY = 'gb_user_id_v1';
    let id = localStorage.getItem(KEY);
    if(!id){ id = crypto?.randomUUID?.() || (Date.now().toString(36)+Math.random().toString(36).slice(2)); localStorage.setItem(KEY, id); }
    return id;
  }
  const userId = getUserId();

  function itemIdFor(btn, i){
    return btn.getAttribute('href') || btn.dataset.href || (btn.textContent.trim().slice(0,50)+'::'+i);
  }

  // Local fallback store (per-browser)
  function loadLocal(){ try{ return JSON.parse(localStorage.getItem(LOCAL_KEY))||{} }catch(e){ return {} } }
  function saveLocal(obj){ try{ localStorage.setItem(LOCAL_KEY, JSON.stringify(obj)); }catch(e){} }

  async function apiGetCounts(itemId){
    if(!USE_REMOTE) return null;
    const u = API_BASE.replace(/\/$/,'') + '/votes/' + encodeURIComponent(itemId) + '?uid=' + encodeURIComponent(userId);
    const res = await fetch(u, {cache:'no-store'});
    if(!res.ok) throw new Error('get counts failed '+res.status);
    return res.json(); // {like, dislike, choice}
  }

  async function apiSendVote(itemId, choice){
    if(!USE_REMOTE) return null;
    const u = API_BASE.replace(/\/$/,'') + '/votes/' + encodeURIComponent(itemId);
    const res = await fetch(u, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ uid: userId, choice }) });
    if(!res.ok) throw new Error('vote failed '+res.status);
    return res.json(); // {like, dislike, choice}
  }

  function ensureVoteControls(btn){
    let extra = btn.querySelector('.nav-extra');
    if(!extra){ extra = document.createElement('div'); extra.className='nav-extra'; btn.appendChild(extra); }
    let vc = extra.querySelector('.vote-controls');
    if(!vc){
      vc = document.createElement('div');
      vc.className = 'vote-controls';
      vc.innerHTML = `
        <button type="button" class="vote-btn like" aria-label="Like">
          <span class="icon">👍</span>
          <span class="count">0</span>
        </button>
        <button type="button" class="vote-btn dislike" aria-label="Dislike">
          <span class="icon">👎</span>
          <span class="count">0</span>
        </button>`;
      extra.appendChild(vc);
    }
    return vc;
  }

  function renderCounts(vc, s){
    const likeBtn = vc.querySelector('.like');
    const dislikeBtn = vc.querySelector('.dislike');
    if(likeBtn) likeBtn.querySelector('.count').textContent = s.like||0;
    if(dislikeBtn) dislikeBtn.querySelector('.count').textContent = s.dislike||0;
    if(likeBtn) likeBtn.classList.toggle('active', s.choice==='like');
    if(dislikeBtn) dislikeBtn.classList.toggle('active', s.choice==='dislike');
  }

  function localToggle(state, itemId, choice){
    const s = state[itemId] || { like:0, dislike:0, choice:null };
    if(s.choice === choice){ s[choice] = Math.max(0,(s[choice]||0)-1); s.choice = null; }
    else {
      if(s.choice && s.choice!==choice){ s[s.choice] = Math.max(0,(s[s.choice]||0)-1); }
      s[choice] = (s[choice]||0) + 1; s.choice = choice;
    }
    state[itemId] = s; saveLocal(state); return s;
  }

  async function init(){
    const state = loadLocal();
    const buttons = Array.from(document.querySelectorAll('.nav-primary .nav-button'))
      // Exclude the Add Game launcher and any custom game buttons from voting
      .filter(btn => !btn.classList.contains('add-game-btn') && !btn.classList.contains('custom-game-button') && !btn.hasAttribute('data-no-votes'));
    buttons.forEach((btn, i)=>{
      const itemId = itemIdFor(btn,i);
      const vc = ensureVoteControls(btn);

      // Load initial counts
      (async()=>{
        try{
          const remote = await apiGetCounts(itemId);
          const s = remote || state[itemId] || {like:0, dislike:0, choice:null};
          renderCounts(vc, s);
        }catch(e){ renderCounts(vc, state[itemId] || {like:0,dislike:0,choice:null}); }
      })();

      // Attach handlers
      vc.querySelector('.like')?.addEventListener('click', async (e)=>{
        e.preventDefault(); e.stopPropagation();
        if(USE_REMOTE){ try{ const s = await apiSendVote(itemId, 'like'); renderCounts(vc, s); }catch(e){} }
        else { const s = localToggle(state, itemId, 'like'); renderCounts(vc, s); }
      });
      vc.querySelector('.dislike')?.addEventListener('click', async (e)=>{
        e.preventDefault(); e.stopPropagation();
        if(USE_REMOTE){ try{ const s = await apiSendVote(itemId, 'dislike'); renderCounts(vc, s); }catch(e){} }
        else { const s = localToggle(state, itemId, 'dislike'); renderCounts(vc, s); }
      });
    });

    // Lightweight periodic refresh to reflect others' votes (remote only)
    if (USE_REMOTE) {
      setInterval(async ()=>{
        const buttons = Array.from(document.querySelectorAll('.nav-primary .nav-button'));
        for(let i=0;i<buttons.length;i++){
          const btn = buttons[i]; const itemId = itemIdFor(btn,i); const vc = btn.querySelector('.vote-controls');
          if(!vc) continue;
          try{ const s = await apiGetCounts(itemId); if(s) renderCounts(vc, s); }catch(e){}
        }
      }, 20000);
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
