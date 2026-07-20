/**
 * addSong.js
 * -----------------------------------------------------------------------------
 * Add Song page: POST /songs
 * Builds the shared feature-slider form (see featureForm.js) into
 * #addAudioFeatures, then submits the new song to the backend. On success,
 * reloads the Home page song list so the new song shows up immediately.
 *
 * FIELD NAMES: the payload below uses track_name / artists / album_name /
 * track_genre / duration_ms / explicit, plus the 12 audio features spread
 * in flat (not nested) — this matches exactly what the backend's song
 * schema expects. See home.js for the full field-name reference.
 *
 * No release year is collected on this page by design — songs are added
 * with a title, artist, album, genre, duration, and audio features only.
 * -----------------------------------------------------------------------------
 */

buildFeatureForm('addAudioFeatures', 'add');

document.getElementById('addSongBtn').addEventListener('click', async () => {
  const title = document.getElementById('addTitle').value.trim();
  const artist = document.getElementById('addArtist').value.trim();
  const album = document.getElementById('addAlbum').value.trim() || 'Single';
  const genre = document.getElementById('addGenre').value;
  const duration = parseInt(document.getElementById('addDuration').value) || 180;
  const explicit = document.getElementById('addExplicit').checked;

  if (!title || !artist) {
    showToast("Please fill in at least a title and artist.", "error");
    return;
  }

  // The backend's song schema is flat (no nested "features" object), so
  // the audio features are spread directly onto the payload here.
  const features = readFeatureForm('add');
  const payload = {
    track_name: title,
    artists: artist,
    album_name: album,
    track_genre: genre,
    duration_ms: duration * 1000,
    explicit,
    ...features
  };

  const btn = document.getElementById('addSongBtn');
  btn.disabled = true;
  btn.textContent = "Adding…";

  const { data: newSong, error } = await apiCall(ENDPOINTS.addSong(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  btn.disabled = false;
  btn.textContent = "Add Song to Database";

  if (error) {
    showToast(error, "error");
    return;
  }

  showToast(`"${title}" was added to the database!`);
  clearAddForm();
  await loadHomeSongs();
});

function clearAddForm() {
  document.getElementById('addTitle').value = '';
  document.getElementById('addArtist').value = '';
  document.getElementById('addAlbum').value = '';
  document.getElementById('addGenre').selectedIndex = 0;
  document.getElementById('addDuration').value = '';
  document.getElementById('addExplicit').checked = false;
  buildFeatureForm('addAudioFeatures', 'add');
}
document.getElementById('addSongClearBtn').addEventListener('click', clearAddForm);
