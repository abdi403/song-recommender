/**
 * utils.js
 * -----------------------------------------------------------------------------
 * Small, generic helper functions shared by every page. None of these know
 * anything about "songs" or "genres" specifically — they're plumbing used by
 * the page-specific files (home.js, search.js, etc).
 * -----------------------------------------------------------------------------
 */

const ERROR_MESSAGE = "Something Went Wrong";

/**
 * Formats a duration for display as m:ss.
 * IMPORTANT: the backend returns song duration in MILLISECONDS
 * (`duration_ms`), so this expects milliseconds, not seconds.
 */
function fmtDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * A ready-to-insert error block for any page section that failed to load
 * data from the backend, e.g. `container.innerHTML = errorStateHTML(error);`.
 * Pass the specific message from apiCall()'s `error` field when you have
 * one — falls back to a generic message if you don't.
 */
function errorStateHTML(message = ERROR_MESSAGE) {
  return `<div class="empty-state"><p class="error-text">${escapeHTML(message)}</p></div>`;
}

/**
 * apiCall(url, options)
 * Thin wrapper around fetch() for talking to the backend (see config.js for
 * the URLs). Always returns { data, error }:
 *   - success: { data: <parsed json>, error: null }
 *   - failure: { data: null, error: "<path> returned <status>: <statusText>" }
 *     (or "<path> failed: <network error message>" if the request never
 *     got a response at all — backend down, DNS failure, timeout, etc.)
 *
 * Every caller MUST check `error` and show it to the user — e.g.
 * `container.innerHTML = errorStateHTML(error)` or `showToast(error, 'error')`.
 * Never let a failed request pass through silently.
 */
async function apiCall(url, options = {}) {
  let path;
  try {
    path = new URL(url).pathname;
  } catch (err) {
    path = url;
  }

  try {
    const res = await fetch(url, { ...options, signal: AbortSignal.timeout(2500) });
    if (!res.ok) {
      const error = `${path} returned ${res.status}: ${res.statusText || 'Error'}`;
      console.error('API request failed:', error);
      return { data: null, error };
    }
    const data = await res.json();
    return { data, error: null };
  } catch (err) {
    const error = `${path} failed: ${err.message || 'Network error'}`;
    console.error('API request failed:', error);
    return { data: null, error };
  }
}

function showToast(message, type = "success") {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'error' : ''}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
