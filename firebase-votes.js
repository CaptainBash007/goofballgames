(function(){
  // Detect global config injected by firebase-config.js
  const CFG = window.FIREBASE_CONFIG;
  if (!CFG) { window.firebaseVotes = null; return; }

  // Load Firebase via CDN (modular) dynamically
  function loadScript(src){ return new Promise((res, rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }

  async function init(){
    // Firebase v10 CDN bundles
  await loadScript('https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js');
  await loadScript('https://www.gstatic.com/firebasejs/10.12.4/firebase-auth-compat.js');
  await loadScript('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore-compat.js');

    const app = firebase.initializeApp(CFG);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Ensure cache disabled for counts (server truth)
    db.settings({ ignoreUndefinedProperties: true });

    // Anonymous auth for stable uid
    async function getUid(){
      if (auth.currentUser) return auth.currentUser.uid;
      try { const cred = await auth.signInAnonymously(); return cred.user.uid; } catch(e){ console.warn('anon sign-in failed', e); throw e; }
    }

    function votesCol(itemId){ return db.collection('votes').doc(itemId).collection('users'); }

    async function getCounts(itemId){
      const uid = (auth.currentUser?.uid) || await getUid();
      try {
        // Prefer aggregation count() if supported
        const likeSnap = await votesCol(itemId).where('choice','==','like').count().get({ source: 'server' });
        const dislikeSnap = await votesCol(itemId).where('choice','==','dislike').count().get({ source: 'server' });
        const mine = await votesCol(itemId).doc(uid).get({ source: 'server' });
        return { like: likeSnap.data().count || 0, dislike: dislikeSnap.data().count || 0, choice: (mine.exists ? mine.data().choice : null) };
      } catch (e) {
        // Fallback: manual count (limited page-size; fine for small usage)
        const likeDocs = await votesCol(itemId).where('choice','==','like').get({ source: 'server' });
        const dislikeDocs = await votesCol(itemId).where('choice','==','dislike').get({ source: 'server' });
        const mine = await votesCol(itemId).doc(uid).get({ source: 'server' });
        return { like: likeDocs.size, dislike: dislikeDocs.size, choice: (mine.exists ? mine.data().choice : null) };
      }
    }

    async function sendVote(itemId, choice){
      const uid = (auth.currentUser?.uid) || await getUid();
      if (choice === null) { await votesCol(itemId).doc(uid).delete(); }
      else { await votesCol(itemId).doc(uid).set({ choice }, { merge: true }); }
      return getCounts(itemId);
    }

    window.firebaseVotes = { getCounts, sendVote };
  }

  init().catch(err=>{ console.warn('firebase init failed', err); window.firebaseVotes = null; });
})();
