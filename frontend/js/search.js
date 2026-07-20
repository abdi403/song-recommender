/**
 * search.js
 * -----------------------------------------------------------------------------
 * Search page: GET /songs/search?q=<query>
 * Listens on both the top bar search box and the dedicated Search page box.
 * Debounces input so it doesn't search on every single keystroke.
 * -----------------------------------------------------------------------------
 */

let searchDebounce;
function handleSearchInput(query) {
  clearTimeout(searchDebounce);
  const resultsDiv = document.getElementById('searchResults');
  if (!query.trim()) {
    resultsDiv.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24"><path d="M10.533 1.279c-5.18 0-9.407 4.14-9.407 9.279s4.226 9.279 9.407 9.279c2.234 0 4.29-.77 5.907-2.058l4.353 4.353a1 1 0 1 0 1.414-1.414l-4.344-4.344a9.157 9.157 0 0 0 2.077-5.816c0-5.14-4.226-9.28-9.407-9.28zm-7.407 9.279c0-4.006 3.302-7.279 7.407-7.279s7.407 3.273 7.407 7.279-3.302 7.279-7.407 7.279-7.407-3.273-7.407-7.279z"/></svg>
        <p>Start typing to search songs by title or artist</p>
      </div>`;
    return;
  }
  resultsDiv.innerHTML = `<div class="loading"><div class="spinner"></div> Searching…</div>`;
  searchDebounce = setTimeout(async () => {
    const { data: results, error } = await apiCall(ENDPOINTS.search(query));

    if (error) {
      resultsDiv.innerHTML = errorStateHTML(error);
      return;
    }

    if (results.length === 0) {
      resultsDiv.innerHTML = `<div class="empty-state"><p>No results for "${escapeHTML(query)}"</p></div>`;
      return;
    }
    resultsDiv.innerHTML = `
      <table class="song-table">
        <thead><tr><th>Title</th><th>Album</th><th>Genre</th><th>Duration</th><th></th></tr></thead>
        <tbody>${results.map(s => songRowHTML(s)).join('')}</tbody>
      </table>
    `;
    attachRowHandlers(resultsDiv);
  }, 350);
}

document.getElementById('searchPageInput').addEventListener('input', (e) => handleSearchInput(e.target.value));
document.getElementById('topSearchInput').addEventListener('input', (e) => {
  goToPage('search');
  document.getElementById('searchPageInput').value = e.target.value;
  handleSearchInput(e.target.value);
});
