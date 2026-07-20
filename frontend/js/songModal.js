/**
 * songModal.js
 * -----------------------------------------------------------------------------
 * The song detail popup opened by clicking a song on Home or Search. It has
 * five tabs, scrollable via the left/right arrow buttons next to them
 * (#modalTabsLeft / #modalTabsRight) when there isn't room to show them all:
 *
 *   - Spotify          : embedded player via Spotify's official iFrame API
 *                        (https://developer.spotify.com/documentation/embeds/tutorials/using-the-iframe-api)
 *   - YouTube           : embeds song.track_youtube_id if the song has one;
 *                        otherwise shows a YouTube search link so you can
 *                        find the video and paste it into Song Features
 *   - Recommendations    : GET /recommend/{track_id}. Stays exactly as
 *                        listed — even if you switch to a different song via
 *                        a recommendation click — until "Refresh
 *                        Recommendations" is clicked, which re-fetches for
 *                        whichever song is currently active in the popup
 *   - Song Features       : editable form for every field in the schema
 *                        (except track_id). "Submit Changes" sends the
 *                        whole form as JSON to the update endpoint
 *   - Predict Features     : sends the song's current audio features to
 *                        POST /predict-features/{track_id} and shows the
 *                        predicted genre + popularity back
 *
 * Clicking a song inside the Recommendations list calls switchToSong(),
 * which makes that song the popup's "current song" — the Spotify embed,
 * Song Features form, YouTube tab, and Predict Features tab all pick up the
 * new song's data next time you open them. The Recommendations list itself
 * does NOT refresh automatically (see above).
 *
 * FIELD NAMES: song objects are flat — audio features (see FEATURE_DEFS in
 * featureForm.js) are top-level fields directly on the song, NOT nested
 * under a "features" key.
 *
 * ERRORS: every backend call here uses apiCall() (utils.js), which returns
 * { data, error }. `error`, when present, is already a specific message
 * like "/predict-features/abc123 returned 404: Not Found" — always show it
 * via errorStateHTML(error) rather than a generic message.
 * -----------------------------------------------------------------------------
 */

let modalCurrentSong = null;
let modalActiveTab = 'spotify';

// Caches the last-fetched recommendation list for the CURRENT popup
// session, so switching tabs (or switching songs via a recommendation
// click) doesn't silently re-fetch — only openSongModal() (a fresh popup)
// or the "Refresh Recommendations" button clears/refills this.
let modalRecommendCache = null;

// Spotify's iFrame API loads asynchronously and calls this once, globally,
// whenever it's ready — see the <script src="https://open.spotify.com/embed/iframe-api/v1">
// tag in index.html. We stash the API object so renderSpotifyTab() can use
// it any time afterwards, however long the popup has been open.
window.onSpotifyIframeApiReady = (IFrameAPI) => {
  window.SpotifyIFrameAPI = IFrameAPI;
};

function openSongModal(songId, initialTab = 'spotify') {
  // dataset.id (from data-id="...") is always a string, but the backend
  // may return a numeric track_id — compare as strings so both cases match.
  const song = ALL_SONGS.find(s => String(s.track_id) === String(songId));
  if (!song) return;

  modalCurrentSong = song;
  modalActiveTab = initialTab;
  modalRecommendCache = null; // fresh popup session — recommendations haven't been fetched yet

  document.getElementById('modalSongTitle').textContent = song.track_name;
  document.getElementById('modalSongArtist').textContent = song.artists;

  document.querySelectorAll('.modal-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === modalActiveTab));
  renderModalTab();
  updateTabArrowState();

  document.getElementById('songModalOverlay').classList.add('open');
}

function closeSongModal() {
  document.getElementById('songModalOverlay').classList.remove('open');
  modalCurrentSong = null;
  modalRecommendCache = null;
}

/**
 * Makes `newSong` (e.g. an item clicked in the Recommendations list) the
 * popup's current song. Updates the header immediately; if the currently
 * visible tab is anything other than Recommendations, re-renders it with
 * the new song right away. (Recommendations itself is left untouched —
 * see the header comment above.)
 */
function switchToSong(newSong) {
  modalCurrentSong = newSong;
  document.getElementById('modalSongTitle').textContent = newSong.track_name;
  document.getElementById('modalSongArtist').textContent = newSong.artists;

  if (modalActiveTab !== 'recommend') {
    renderModalTab();
  }
}

function renderModalTab() {
  if (!modalCurrentSong) return;

  if (modalActiveTab === 'spotify') renderSpotifyTab(modalCurrentSong);
  else if (modalActiveTab === 'youtube') renderYouTubeTab(modalCurrentSong);
  else if (modalActiveTab === 'recommend') loadRecommendTab(modalCurrentSong);
  else if (modalActiveTab === 'features') renderFeaturesTab(modalCurrentSong);
  else if (modalActiveTab === 'predict') renderPredictFeaturesTab(modalCurrentSong);
}

document.querySelectorAll('.modal-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    modalActiveTab = tab.dataset.tab;
    document.querySelectorAll('.modal-tab').forEach(t => t.classList.toggle('active', t === tab));
    renderModalTab();
  });
});

document.getElementById('modalCloseBtn').addEventListener('click', closeSongModal);
document.getElementById('songModalOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'songModalOverlay') closeSongModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSongModal();
});

/* ---------------- Tab strip left/right scroll arrows ---------------- */

const modalTabsScroll = document.getElementById('modalTabsScroll');
const modalTabsLeftBtn = document.getElementById('modalTabsLeft');
const modalTabsRightBtn = document.getElementById('modalTabsRight');

function updateTabArrowState() {
  if (!modalTabsScroll) return;
  modalTabsLeftBtn.disabled = modalTabsScroll.scrollLeft <= 0;
  modalTabsRightBtn.disabled = modalTabsScroll.scrollLeft + modalTabsScroll.clientWidth >= modalTabsScroll.scrollWidth - 1;
}

modalTabsLeftBtn.addEventListener('click', () => modalTabsScroll.scrollBy({ left: -120, behavior: 'smooth' }));
modalTabsRightBtn.addEventListener('click', () => modalTabsScroll.scrollBy({ left: 120, behavior: 'smooth' }));
modalTabsScroll.addEventListener('scroll', updateTabArrowState);
window.addEventListener('resize', updateTabArrowState);

/* ---------------- Spotify tab ---------------- */

/**
 * Uses Spotify's official iFrame API instead of a plain embed <iframe src=...>,
 * so the player can be controlled/reused via JS if you build on this later.
 * See: https://developer.spotify.com/documentation/embeds/tutorials/using-the-iframe-api
 *
 * ASSUMPTION: song.track_id is the actual Spotify track ID (true for the
 * "Spotify Tracks Dataset" this schema matches), so the Spotify URI is
 * built as spotify:track:{track_id}. If your backend's track_id isn't a
 * real Spotify ID, this tab won't be able to find a matching track.
 */
function renderSpotifyTab(song) {
  const body = document.getElementById('modalBody');
  body.innerHTML = `
    <div class="tab-panel">
      <p class="tab-hint">Spotify player, via Spotify's official iFrame API.</p>
      <div id="spotifyEmbedIframe"></div>
    </div>
  `;
  mountSpotifyEmbed(song, 0);
}

function mountSpotifyEmbed(song, attempt) {
  const container = document.getElementById('spotifyEmbedIframe');
  // Bail out if the tab/popup was closed or switched away before this ran.
  if (!container || modalActiveTab !== 'spotify' || modalCurrentSong !== song) return;

  if (window.SpotifyIFrameAPI) {
    container.innerHTML = '';
    window.SpotifyIFrameAPI.createController(container, {
      uri: `spotify:track:${song.track_id}`,
      width: '100%',
      height: '160',
    }, () => {});
    return;
  }

  // The iFrame API script (loaded in index.html) may not have finished
  // loading yet — retry for a few seconds before giving up.
  if (attempt < 20) {
    setTimeout(() => mountSpotifyEmbed(song, attempt + 1), 300);
  } else {
    container.innerHTML = errorStateHTML('Spotify player failed to load.');
  }
}

/* ---------------- YouTube tab ---------------- */

function extractYoutubeId(input) {
  if (!input) return "";

  input = input.trim();

  // Already looks like a YouTube video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input;
  }

  try {
    const url = new URL(input);

    // https://youtu.be/VIDEO_ID
    if (url.hostname === "youtu.be") {
      return url.pathname.slice(1);
    }

    // https://www.youtube.com/watch?v=VIDEO_ID
    const videoId = url.searchParams.get("v");
    if (videoId) {
      return videoId;
    }

    // https://www.youtube.com/embed/VIDEO_ID
    const match = url.pathname.match(/^\/embed\/([^/?]+)/);
    if (match) {
      return match[1];
    }
  } catch {
    // Not a valid URL
  }

  return "";
}

/**
 * Builds a YouTube search-results URL from the song's title + artist, e.g.
 * track_name "Cherono" + artists "Abishai Spiritman" ->
 * https://www.youtube.com/results?search_query=cherono+abishai+spiritman
 */
function buildYoutubeSearchUrl(song) {
  const query = `${song.track_name} ${song.artists}`.toLowerCase();
  const encoded = encodeURIComponent(query).replace(/%20/g, '+');
  return `https://www.youtube.com/results?search_query=${encoded}`;
}

/**
 * Embeds song.track_youtube_id directly if the song has one. If not,
 * shows a YouTube search link instead, so the link can be found and then
 * pasted into the YouTube Link field on the Song Features tab.
 */
function renderYouTubeTab(song) {
  const body = document.getElementById('modalBody');

  if (!song.track_youtube_id) {
    const searchUrl = buildYoutubeSearchUrl(song);
    body.innerHTML = `
      <div class="tab-panel">
        <p class="tab-hint">No YouTube link saved for this song yet.</p>
        <a class="btn btn-primary" target="_blank" rel="noopener" href="${searchUrl}">Search YouTube for "${escapeHTML(song.track_name)}"</a>
        <p class="tab-hint">Found the right video? Paste its embed link into the YouTube Link field on the Song Features tab and hit Submit Changes.</p>
      </div>
    `;
    return;
  }

  body.innerHTML = `
    <div class="tab-panel">
      <iframe
          class="embed-frame"
          src="https://www.youtube.com/embed/${encodeURIComponent(song.track_youtube_id)}"
          title="${escapeHTML(song.track_name)}"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen>
      </iframe>
    </div>
  `;
}

/* ---------------- Recommendations tab ---------------- */

function loadRecommendTab(song) {
  const body = document.getElementById('modalBody');
  body.innerHTML = `
    <div class="tab-panel">
      <button class="btn btn-secondary" id="refreshRecommendationsBtn">Refresh Recommendations</button>
      <div id="recommendListContainer"></div>
    </div>
  `;

  // Always refreshes for whichever song is CURRENTLY active in the popup
  // (modalCurrentSong), not necessarily the song this tab first loaded for.
  document.getElementById('refreshRecommendationsBtn').addEventListener('click', () => {
    fetchRecommendations(modalCurrentSong);
  });

  if (modalRecommendCache) {
    renderRecommendList(modalRecommendCache);
  } else {
    fetchRecommendations(song);
  }
}

async function fetchRecommendations(song) {
  const container = document.getElementById('recommendListContainer');
  if (!container) return; // popup closed / switched tabs before this ran
  container.innerHTML = `<div class="loading"><div class="spinner"></div> Finding similar songs…</div>`;

  const { data: recs, error } = await apiCall(ENDPOINTS.recommend(song.track_id));

  // The user may have switched away from the Recommendations tab while
  // this was in flight — bail out instead of writing into a gone element.
  const stillOnRecommendTab = document.getElementById('recommendListContainer');
  if (!stillOnRecommendTab) return;

  if (error) {
    modalRecommendCache = null;
    stillOnRecommendTab.innerHTML = errorStateHTML(error);
    return;
  }

  modalRecommendCache = recs;
  renderRecommendList(recs);
}

function renderRecommendList(recs) {
  const container = document.getElementById('recommendListContainer');
  if (!container) return;

  if (recs.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No recommendations available.</p></div>`;
    return;
  }

  container.innerHTML = `
    <ul class="rec-list">
      ${recs.map(s => `
        <li class="rec-list-item">
          <div class="rec-list-info">
            <strong>${escapeHTML(s.track_name)}</strong>
            <span>${escapeHTML(s.artists)}</span>
          </div>
          ${s.similarity !== undefined ? `<span class="similarity-pill">${Math.round(s.similarity * 100)}% match</span>` : ''}
        </li>
      `).join('')}
    </ul>
  `;

  // Bound by array index rather than a data-id lookup, since a recommended
  // song may not exist in ALL_SONGS (it comes from a separate endpoint).
  container.querySelectorAll('.rec-list-item').forEach((item, i) => {
    item.addEventListener('click', () => switchToSong(recs[i]));
  });
}

/* ---------------- Song Features tab ---------------- */

/**
 * Editable form for every field in the schema except track_id (the
 * identifier itself isn't editable). "Submit Changes" sends the whole
 * thing as JSON to ENDPOINTS.updateSong(track_id).
 */
function renderFeaturesTab(song) {
  const body = document.getElementById('modalBody');

  body.innerHTML = `
    <div class="tab-panel">
      <div class="form-grid">
        <div class="form-group">
          <label for="featTrackName">Title</label>
          <input type="text" id="featTrackName" value="${escapeHTML(song.track_name || '')}">
        </div>
        <div class="form-group">
          <label for="featArtists">Artists</label>
          <input type="text" id="featArtists" value="${escapeHTML(song.artists || '')}">
        </div>
        <div class="form-group">
          <label for="featAlbumName">Album</label>
          <input type="text" id="featAlbumName" value="${escapeHTML(song.album_name || '')}">
        </div>
        <div class="form-group">
          <label for="featGenre">Genre</label>
          <input type="text" id="featGenre" value="${escapeHTML(song.track_genre || '')}">
        </div>
        <div class="form-group">
          <label for="featPopularity">Popularity</label>
          <input type="number" id="featPopularity" min="0" max="100" value="${song.popularity ?? ''}">
        </div>
        <div class="form-group">
          <label for="featDuration">Duration (ms)</label>
          <input type="number" id="featDuration" min="0" value="${song.duration_ms ?? ''}">
        </div>
        <div class="form-group full">
          <label for="featYoutubeID">YouTube Link</label>
          <input type="text" id="featYoutubeID" value="${escapeHTML(song.track_youtube_id || '')}" placeholder="Paste any YouTube URL or video ID">
        </div>
        <div class="form-group">
          <label for="featExplicit">Explicit</label>
          <label class="checkbox-row">
            <input type="checkbox" id="featExplicit" ${song.explicit ? 'checked' : ''}>
            <span>Contains explicit content</span>
          </label>
        </div>
      </div>

      <h3 class="section-title" style="margin:20px 0 12px;">Audio Features</h3>
      <div class="form-grid" id="featuresFormGrid"></div>

      <div class="btn-row">
        <button class="btn btn-primary" id="submitFeatureChangesBtn">Submit Changes</button>
      </div>
      <div id="submitFeatureChangesResult"></div>
    </div>
  `;

  // Pre-fill sliders with this song's current values instead of defaults.
  buildFeatureForm('featuresFormGrid', 'feat', song);

  document.getElementById('submitFeatureChangesBtn').addEventListener('click', async () => {
    const btn = document.getElementById('submitFeatureChangesBtn');
    const resultDiv = document.getElementById('submitFeatureChangesResult');
    btn.disabled = true;
    btn.textContent = 'Saving…';

    const audioFeatures = readFeatureForm('feat');
    const payload = {
      track_name: document.getElementById('featTrackName').value.trim(),
      artists: document.getElementById('featArtists').value.trim(),
      album_name: document.getElementById('featAlbumName').value.trim(),
      track_genre: document.getElementById('featGenre').value.trim(),
      popularity: parseInt(document.getElementById('featPopularity').value) || 0,
      duration_ms: parseInt(document.getElementById('featDuration').value) || 0,
      track_youtube_id: extractYoutubeId(document.getElementById('featYoutubeID').value),
      explicit: document.getElementById('featExplicit').checked ? "TRUE" : "FALSE",
      ...audioFeatures
    };

    const { error } = await apiCall(ENDPOINTS.updateSong(song.track_id), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    btn.disabled = false;
    btn.textContent = 'Submit Changes';

    if (error) {
      resultDiv.innerHTML = errorStateHTML(error);
      return;
    }

    // Reflect the update locally (track_id is untouched since it's not in
    // payload), refresh the header, and reload the Home table so it shows
    // the new values too.
    Object.assign(song, payload);
    document.getElementById('modalSongTitle').textContent = song.track_name;
    document.getElementById('modalSongArtist').textContent = song.artists;
    resultDiv.innerHTML = '';
    showToast('Song updated!');
    await loadHomeSongs();
  });
}

/* ---------------- Predict Features tab ---------------- */

/**
 * Sends this song's id to GET /predict-features/{track_id}
 * and shows back the predicted genre + popularity. Expects a JSON response
 * shaped like: { "genre": "pop", "popularity": 62 }
 */
function renderPredictFeaturesTab(song) {
  const body = document.getElementById('modalBody');
  body.innerHTML = `
    <div class="tab-panel">
      <p class="tab-hint">Predict this song's genre and popularity from its audio features.</p>
      <button class="btn btn-primary" id="predictFeaturesBtn">Predict Genre &amp; Popularity</button>
      <div id="predictFeaturesResult"></div>
    </div>
  `;

  document.getElementById('predictFeaturesBtn').addEventListener('click', async () => {
    const btn = document.getElementById('predictFeaturesBtn');
    const resultDiv = document.getElementById('predictFeaturesResult');
    btn.disabled = true;
    btn.textContent = 'Predicting…';

    const { data: result, error } = await apiCall(ENDPOINTS.predictFeatures(song.track_id), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    btn.disabled = false;
    btn.textContent = 'Predict Genre & Popularity';

    if (error) {
      resultDiv.innerHTML = errorStateHTML(error);
      return;
    }

    resultDiv.innerHTML = `
      <div class="feature-row">
        <span class="feature-label">Predicted Genre</span>
        <span class="feature-value">${escapeHTML(String(result.genre))}</span>
      </div>
      <div class="feature-row">
        <span class="feature-label">Predicted Popularity</span>
        <span class="feature-value">${result.popularity}</span>
      </div>
    `;
  });
}
