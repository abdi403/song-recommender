/**
 * config.js
 * -----------------------------------------------------------------------------
 * Central place where the app knows *where* the backend lives and *which*
 * routes to call. Nothing here does any work — it just builds URL strings
 * that the rest of the app (see utils.js -> apiCall) uses.
 *
 * WHERE TO CHANGE THINGS:
 *   - Changing the backend URL? Edit js/env.js (NOT this file).
 *   - Backend added/renamed/removed a route? Update the matching line below.
 * -----------------------------------------------------------------------------
 */

// Falls back to a default if env.js wasn't copied from env.example.js yet.
const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || "http://127.0.0.1:8000";

const ENDPOINTS = {
  songs: () => `${API_BASE}/songs`,
  search: (q) => `${API_BASE}/songs/search?q=${encodeURIComponent(q)}`,
  recommend: (id) => `${API_BASE}/recommend/${id}`,
  predictFeatures: (id) => `${API_BASE}/predict-features/${id}`,
  addSong: () => `${API_BASE}/songs`,
  // NOTE: singular "song" (not "songs") — this is intentional, matching
  // the backend's actual update route. Don't "fix" this into /songs/{id}.
  updateSong: (id) => `${API_BASE}/song/${id}`,
};
