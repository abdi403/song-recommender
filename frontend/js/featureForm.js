/**
 * featureForm.js
 * -----------------------------------------------------------------------------
 * Shared "audio feature sliders" component, used by the Add Song page (to
 * enter features for a new song) and reused for building the feature
 * payload sent to POST /predict-features from the song popup.
 *
 * FIELD NAMES: these keys match the backend's song schema exactly:
 *   track_id,artists,album_name,track_name,popularity,duration_ms,explicit,
 *   danceability,energy,key,loudness,mode,speechiness,acousticness,
 *   instrumentalness,liveness,valence,tempo,time_signature,track_genre,
 *   track_youtube_link
 * FEATURE_DEFS below covers the 12 numeric audio-feature columns only
 * (not track_id/artists/album_name/track_name/popularity/duration_ms/
 * explicit/track_genre/track_youtube_link, which are handled elsewhere).
 *
 * WHERE TO CHANGE THINGS:
 *   - Backend model expects a different feature (e.g. new column, renamed
 *     field, different min/max range)? Update FEATURE_DEFS below — every
 *     page that uses this form updates automatically.
 * -----------------------------------------------------------------------------
 */

const FEATURE_DEFS = [
  { key: 'danceability', label: 'Danceability', min: 0, max: 1, step: 0.01, def: 0.5 },
  { key: 'energy', label: 'Energy', min: 0, max: 1, step: 0.01, def: 0.5 },
  { key: 'key', label: 'Key', min: 0, max: 11, step: 1, def: 5 },
  { key: 'loudness', label: 'Loudness (dB)', min: -60, max: 0, step: 0.1, def: -10 },
  { key: 'mode', label: 'Mode (0 = minor, 1 = major)', min: 0, max: 1, step: 1, def: 1 },
  { key: 'speechiness', label: 'Speechiness', min: 0, max: 1, step: 0.01, def: 0.08 },
  { key: 'acousticness', label: 'Acousticness', min: 0, max: 1, step: 0.01, def: 0.3 },
  { key: 'instrumentalness', label: 'Instrumentalness', min: 0, max: 1, step: 0.01, def: 0.1 },
  { key: 'liveness', label: 'Liveness', min: 0, max: 1, step: 0.01, def: 0.15 },
  { key: 'valence', label: 'Valence (Positivity)', min: 0, max: 1, step: 0.01, def: 0.5 },
  { key: 'tempo', label: 'Tempo (BPM)', min: 40, max: 220, step: 1, def: 120 },
  { key: 'time_signature', label: 'Time Signature', min: 3, max: 7, step: 1, def: 4 },
];

/**
 * Builds the slider markup into #containerId. `values` is optional — pass
 * a song object (or any {key: value} map) to pre-fill sliders with current
 * data instead of the defaults; omit it to get the defaults (e.g. for a
 * blank Add Song form).
 */
function buildFeatureForm(containerId, prefix, values = {}) {
  const container = document.getElementById(containerId);
  container.innerHTML = FEATURE_DEFS.map(f => {
    const val = (values[f.key] !== undefined && values[f.key] !== null) ? values[f.key] : f.def;
    return `
    <div class="form-group">
      <label for="${prefix}_${f.key}">${f.label}</label>
      <div class="slider-row">
        <input type="range" id="${prefix}_${f.key}" min="${f.min}" max="${f.max}" step="${f.step}" value="${val}"
          oninput="document.getElementById('${prefix}_${f.key}_val').textContent = this.value">
        <span class="slider-value" id="${prefix}_${f.key}_val">${val}</span>
      </div>
    </div>
  `;
  }).join('');
}

function readFeatureForm(prefix) {
  const obj = {};
  FEATURE_DEFS.forEach(f => {
    obj[f.key] = parseFloat(document.getElementById(`${prefix}_${f.key}`).value);
  });
  return obj;
}

function randomizeFeatureForm(prefix) {
  FEATURE_DEFS.forEach(f => {
    const val = (f.key === 'tempo' || f.key === 'key' || f.key === 'mode' || f.key === 'time_signature')
      ? Math.floor(f.min + Math.random() * (f.max - f.min))
      : +(f.min + Math.random() * (f.max - f.min)).toFixed(2);
    document.getElementById(`${prefix}_${f.key}`).value = val;
    document.getElementById(`${prefix}_${f.key}_val`).textContent = val;
  });
}

