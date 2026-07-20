/**
 * home.js
 * -----------------------------------------------------------------------------
 * Home page: GET /songs
 * Shows the top stats strip (total songs / genres / avg popularity) and the
 * full song table. Clicking a row (or its "recommend" icon) opens the song
 * detail popup for that song — see songModal.js.
 *
 * FIELD NAMES: songRowHTML() and renderStatStrip() read song.track_id /
 * song.track_name / song.artists / song.album_name / song.track_genre /
 * song.duration_ms / song.popularity — these are the exact field names the
 * real backend returns for a song (this matches the well-known "Spotify
 * Tracks Dataset" schema). search.js and songModal.js are kept consistent
 * with these same names.
 *
 * ALL_SONGS holds the most recent list returned by the backend. Other files
 * (songModal.js) read it too, instead of each fetching its own copy.
 * -----------------------------------------------------------------------------
 */

let ALL_SONGS = [];

function renderStatStrip() {
  const strip = document.getElementById('statStrip');
  const avgPop = Math.round(ALL_SONGS.reduce((a, s) => a + s.popularity, 0) / ALL_SONGS.length);
  const genreCount = new Set(ALL_SONGS.map(s => s.track_genre)).size;
  strip.innerHTML = `
    <div class="stat-pill"><div class="num">${ALL_SONGS.length}</div><div class="lbl">Total Songs</div></div>
    <div class="stat-pill"><div class="num">${genreCount}</div><div class="lbl">Genres</div></div>
    <div class="stat-pill"><div class="num">${avgPop}</div><div class="lbl">Avg. Popularity</div></div>
  `;
}

function songRowHTML(song, showActions = true) {
  return `
    <tr class="song-row" data-id="${song.track_id}">
      <td>
        <div class="song-cell">
          <div class="song-meta">
            <strong>${escapeHTML(song.track_name)}</strong>
            <span>${escapeHTML(song.artists)}</span>
          </div>
        </div>
      </td>
      <td>${escapeHTML(song.album_name)}</td>
      <td><span class="badge">${song.track_genre}</span></td>
      <td>${fmtDuration(song.duration_ms)}</td>      <td>
        <div class="row-actions">
          <button class="icon-btn recommend-icon" data-id="${song.track_id}" title="Get recommendations">
            <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

async function loadHomeSongs() {
  const container = document.getElementById('homeSongsContainer');
  container.innerHTML = `<div class="loading"><div class="spinner"></div> Loading songs…</div>`;

  const { data: songs, error } = await apiCall(ENDPOINTS.songs());

  if (error) {
    container.innerHTML = errorStateHTML(error);
    document.getElementById('statStrip').innerHTML = '';
    return;
  }

  ALL_SONGS = songs;
  renderStatStrip();

  if (songs.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No songs found in the database.</p></div>`;
    return;
  }

  container.innerHTML = `
    <table class="song-table">
      <thead>
        <tr>
          <th>Title</th><th>Album</th><th>Genre</th><th>Duration</th><th></th>
        </tr>
      </thead>
      <tbody>
        ${songs.map(s => songRowHTML(s)).join('')}
      </tbody>
    </table>
  `;

  attachRowHandlers(container);
}

/**
 * Manual "Refresh" button on the Home page — simply re-runs loadHomeSongs(),
 * which hits GET /songs again and re-renders the table with whatever the
 * backend currently has (e.g. after adding a song from another tab/device).
 */
document.getElementById('refreshSongsBtn').addEventListener('click', async () => {
  const btn = document.getElementById('refreshSongsBtn');
  btn.disabled = true;
  btn.textContent = 'Refreshing…';
  await loadHomeSongs();
  btn.disabled = false;
  btn.textContent = 'Refresh';
});

function attachRowHandlers(container) {
  // The small icon jumps straight to the Recommendations tab of the popup;
  // clicking anywhere else on the row opens the popup on its default tab.
  container.querySelectorAll('.recommend-icon').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openSongModal(btn.dataset.id, 'recommend');
    });
  });
  container.querySelectorAll('.song-row').forEach(row => {
    row.addEventListener('click', () => {
      openSongModal(row.dataset.id);
    });
  });
}
