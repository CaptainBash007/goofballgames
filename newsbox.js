/* newsbox.js — load the site news from a single text file `news.txt`.
   Edit `news.txt` in your project (and on Neocities) to update all `.news-box` text.
*/
(function(){
  const PATH = 'news.txt';

  function apply(text){
    const boxes = document.querySelectorAll('.news-box');
    boxes.forEach(b => { b.textContent = text; });
  }

  // Try to fetch the text file. If fetch fails, do nothing and keep existing text.
  fetch(PATH, { cache: 'no-cache' }).then(res => {
    if (!res.ok) throw new Error('no news');
    return res.text();
  }).then(text => {
    // trim trailing newlines and use as single-line content
    const t = text.replace(/[\r\n]+/g,' ').trim();
    if (t) apply(t);
  }).catch(()=>{
    // leave existing content alone if file isn't present or fetch blocked
  });

})();
