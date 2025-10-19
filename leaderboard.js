// Build a nicely formatted Top 25 leaderboard from easy-to-edit <li> stubs in #leaderboard-data
(function () {
  const dataList = document.getElementById('leaderboard-data');
  const rowsHost = document.getElementById('leaderboard-rows');
  if (!dataList || !rowsHost) return;

  // Read entries from hidden list items: attributes data-name, data-cash, data-date
  const entries = Array.from(dataList.querySelectorAll('li')).map((li) => {
    const name = (li.getAttribute('data-name') || '').trim();
    const cash = Number(li.getAttribute('data-cash') || '0');
    const date = (li.getAttribute('data-date') || '').trim();
    const url = (li.getAttribute('data-url') || '').trim();
    return { name, cash, date, url };
  });

  // Sort by Pirate Cash descending, then name asc as tiebreaker
  entries.sort((a, b) => (b.cash - a.cash) || a.name.localeCompare(b.name));

  const top = entries.slice(0, 25);

  // Render exactly 25 rows; fill missing with blanks
  rowsHost.innerHTML = '';
  for (let i = 0; i < 25; i++) {
    const e = top[i] || { name: '', cash: NaN, date: '', url: '' };
    const url = (e.url || '').trim();
    const isClickable = !!url;

    // Create row as a link if URL exists, else a div
    const row = document.createElement(isClickable ? 'a' : 'div');
    row.className = 'lb-row' + (isClickable ? ' lb-row-link' : '');
    row.setAttribute('role', 'listitem');
    if (isClickable) {
      row.href = url;
      row.target = '_blank';
      row.rel = 'noopener noreferrer';
      row.title = 'Open verification video in a new tab';
    }

    row.innerHTML = `
      <div class=\"lb-col rank\">${i + 1}</div>
      <div class=\"lb-col name\">${escapeHtml(e.name)}</div>
      <div class=\"lb-col cash\">${isFinite(e.cash) ? formatCash(e.cash) : ''}</div>
      <div class=\"lb-col date\">${formatDate(e.date)}</div>
    `;
    rowsHost.appendChild(row);
  }

  // 26th spot is handled by the expand panel below.

  // Expand/collapse submission info
  const expandBtn = document.getElementById('lb-expand-btn');
  const submitBox = document.getElementById('lb-submit');
  if (expandBtn && submitBox) {
    expandBtn.addEventListener('click', () => {
      const expanded = expandBtn.getAttribute('aria-expanded') === 'true';
      const next = !expanded;
      expandBtn.setAttribute('aria-expanded', String(next));
      submitBox.hidden = !next;
    });
  }

  function formatCash(n) {
    if (!isFinite(n)) return '0';
    return `${n.toLocaleString()} PC`;
  }

  function formatDate(s) {
    if (!s) return '-';
    // Accepts YYYY-MM-DD; fallback to raw string if invalid
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
})();
