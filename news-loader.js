/* news-loader.js
   Minimal loader: fetches plain text from `news.txt` and inserts it into
   every element with class `news-box`.
   The file is intentionally small and cache-busted (timestamp) so you can
   edit `news.txt` once and every page will pick up the change.
*/
(function(){
  const PATH = 'news.txt';
  async function loadNews(){
    try{
      const url = PATH + '?_=' + Date.now();
      const res = await fetch(url, {cache: 'no-cache'});
      if(!res.ok) throw new Error('Failed to fetch '+PATH+' ('+res.status+')');
      let text = await res.text();
      // collapse newlines and trim
      text = text.replace(/\r?\n+/g, ' ').trim();
      if(!text) return;
      const nodes = document.querySelectorAll('.news-box');
      nodes.forEach(n => {
        // replace content safely (keep children removed)
        n.textContent = text;
      });
    }catch(err){
      // fail silently but keep a helpful console message
      console.error('news-loader:', err);
    }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadNews);
  else loadNews();
  // expose a tiny public API so header-loader can refresh after injecting header
  window.newsLoader = {
    refresh: loadNews
  };
})();
