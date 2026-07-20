# Soundwave — Frontend

This is the web UI for the Soundwave music app. It's plain **HTML + CSS +
JavaScript** — no frameworks, no build tools, no `npm install`. If you can
open a file in a browser, you can run this.

It's built to plug into a data-science backend (a genre classifier, a
popularity predictor, a recommender, etc.) over a simple REST API. Every
page calls the backend directly — see the table below for which route each
page uses. If a request fails for any reason (backend not running, wrong
URL, network error, server error), the page shows exactly which endpoint
failed and why — e.g. **`/songs returned 500: Internal Server Error`** —
in red, instead of guessing or making up data. A live status dot in the
sidebar also tells you at a glance whether the backend is currently
reachable.

## Why plain HTML/CSS/JS?

As a data science student, you probably don't want to learn React, Vue,
Webpack, npm, etc. just to put a UI in front of your model. A single
`index.html` you can double-click to open (or serve with one command) is
the smallest possible setup that still lets you organize your code well.
When your project grows, you can always migrate to a framework later —
nothing here locks you in.

## Folder structure

```
frontend/
├── index.html              <- The one and only HTML page (a "single-page app")
├── README.md                <- You are here
├── .gitignore                <- Keeps your local env.js out of git
├── css/
│   └── style.css            <- ALL visual styling (colors, spacing, layout)
└── js/
    ├── env.example.js       <- Template for environment config (commit this)
    ├── env.js               <- YOUR local config (never committed, see below)
    ├── config.js            <- Builds API URLs from env.js
    ├── apiStatus.js          <- Live "is the backend up?" status dot in the sidebar
    ├── utils.js               <- Small shared helpers (fetch wrapper, toast, formatting, error message)
    ├── featureForm.js          <- Shared "audio feature sliders" component
    ├── navigation.js            <- Switches between pages (sidebar)
    ├── home.js                   <- Home page (song list)
    ├── search.js                  <- Search page
    ├── songModal.js                <- Song detail popup (Spotify/YouTube/Recommendations/Features/Predict)
    ├── addSong.js                     <- Add Song page
    └── main.js                          <- Starts the app (runs last)
```

### How the pieces map to what you see on screen

| File              | Page / component it powers                          | Backend route(s) it calls        |
|-------------------|-------------------------------------------------------|----------------------------------|
| `home.js`         | "Home" — table of all songs, plus a manual Refresh button | `GET /songs`                  |
| `search.js`       | "Search" — search by title/artist                     | `GET /songs/search`              |
| `songModal.js`    | Song detail popup — Spotify / YouTube / Recommendations / Song Features / Predict Features tabs, opened by clicking any song | `GET /recommend/{track_id}`, `PUT /song/{track_id}`, `POST /predict-features/{track_id}` |
| `addSong.js`      | "Add Song" — form to add a new song                    | `POST /songs`                    |
| `featureForm.js`  | The 12-slider "audio features" form, reused by the Add Song page and for building the payload sent to Predict Features | — (no route, just UI) |
| `navigation.js`   | Sidebar buttons that switch pages                      | — (no route)                     |
| `apiStatus.js`    | Live red/green backend status dot in the sidebar       | `GET /songs` (used as a lightweight ping) |
| `utils.js`        | `apiCall()` (fetch wrapper), `showToast()`, error message, formatting | — (shared plumbing) |
| `config.js` / `env.js` | Where the backend URL is configured               | — (configuration only)          |

There is no standalone "Predict Genre" or "Predict Popularity" page —
that functionality lives only in the popup's **Predict Features** tab
(see "The song detail popup" below).

Note that the raw routes above are listed here in the README for developers —
the app doesn't print endpoint paths in the UI during normal use. The one
deliberate exception is error messages: when a request fails, showing the
exact endpoint and status (see "When something goes wrong" below) is the
point, so a user can report ("`/predict-features/a1b2c3` returned 404")
something actionable instead of a vague failure.

There's no framework and no bundler, so every `.js` file above is loaded
directly by `<script>` tags in `index.html`, in a specific order (see "Load
order" below). Every function ends up as a plain global function — that's
normal and fine at this scale. It's the simplest mental model: **one file,
one job**.

## Running it locally

You don't need Node.js, npm, or any install step to view the UI. Any of
these work:

1. **Just open the file** — double-click `index.html`, or drag it into your
   browser. (Some browsers restrict `fetch` on `file://` pages — if a page
   shows a red "returned ... " error right away, use option 2 instead.)
2. **Serve it with Python** (already on most data-science machines):
   ```bash
   cd frontend
   python3 -m http.server 5500
   ```
   Then open `http://localhost:5500` in your browser.
3. **VS Code "Live Server" extension** — right-click `index.html` → "Open
   with Live Server".

You'll also need your backend running (see your backend project's own
README) — this frontend has nothing to show without it.

## Connecting to the backend

1. Copy the template file:
   ```bash
   cp js/env.example.js js/env.js
   ```
   (A working `js/env.js` is already included so the app runs immediately —
   you only need to do this if you ever delete it.)
2. Open `js/env.js` and set `API_BASE` to wherever your backend runs, e.g.:
   ```js
   window.APP_CONFIG = {
     API_BASE: "http://127.0.0.1:8000",   // FastAPI/Flask running locally
   };
   ```
3. When you deploy (e.g. your backend moves to a real server), change
   `API_BASE` to that server's URL — that's the **only** file you need to
   touch to point the whole app at a different backend.

`js/env.js` is listed in `.gitignore` on purpose: it's a per-environment
setting, not code, so it shouldn't be committed. `js/env.example.js` is the
template that *is* committed, so anyone cloning the project knows what to
copy and fill in.

## The song detail popup

Clicking any song — on Home or on Search — opens a popup instead of
navigating to a separate page. It has five tabs, all handled by
`js/songModal.js`. If there isn't room to show every tab, use the `‹`/`›`
arrows next to the tab strip to scroll to the rest — no ugly native
horizontal scrollbar.

| Tab                   | What it does                                                             |
|-----------------------|-----------------------------------------------------------------------------|
| **Spotify**           | An embedded player using Spotify's official [iFrame API](https://developer.spotify.com/documentation/embeds/tutorials/using-the-iframe-api). Built from `spotify:track:{track_id}`, so this assumes `track_id` is a real Spotify track ID (true for the "Spotify Tracks Dataset" this schema matches). |
| **YouTube**           | Embeds `song.track_youtube_link` if the song has one. If not, shows a YouTube search link (built from the title + artist) so you can find the right video and paste its link into Song Features. |
| **Recommendations**   | Calls `GET /recommend/{track_id}` and shows similar songs as a list. The list stays exactly as-is — even across tab switches or switching songs via a recommendation click — until you click **Refresh Recommendations**, which re-fetches for whichever song is currently active in the popup. |
| **Song Features**     | An editable form covering every field in the schema except `track_id`. Click **Submit Changes** to send the whole form as JSON to the update endpoint. |
| **Predict Features**  | Sends the song's current audio features to `POST /predict-features/{track_id}` and shows back the predicted genre and popularity. |

**Clicking a song inside the Recommendations list** calls `switchToSong()`,
which makes that song the popup's "current song" — the Spotify embed,
Song Features form, YouTube tab, and Predict Features tab all pick up its
data the next time you open them (or immediately, if you're already on one
of those tabs). The Recommendations list itself does **not** refresh
automatically when you do this — only the Refresh Recommendations button
does that.

**Upgrading the Spotify/YouTube tabs later:** the code above assumes
`track_id` doubles as a Spotify ID and builds YouTube search URLs from
title + artist. If either assumption doesn't hold for your data, the
functions to adjust are `renderSpotifyTab()` / `mountSpotifyEmbed()` and
`renderYouTubeTab()` / `buildYoutubeSearchUrl()` in `js/songModal.js`.

## Updating a song

The Song Features tab's **Submit Changes** button sends a `PUT` request to
`ENDPOINTS.updateSong(track_id)` in `config.js`, which points at
`/song/{track_id}` — note the **singular** "song", unlike every other
route in this app (`/songs`, `/songs/search`, etc). That's intentional and
matches the backend's actual update route; if your backend later renames
it, update `updateSong` in `config.js` only.

## Theme & branding

The color scheme is blue-based (`--accent: #1d78e2` in `css/style.css`),
not Spotify green — change that one variable (and `--accent-hover` right
below it) to re-theme the whole app, since everything else references it.

The logo/favicon is an original three-bar "equalizer" mark (not a
Spotify-style icon), defined in two places that need to stay in sync if
you change it:
- `.logo svg` in `index.html` (sidebar)
- the inline `data:image/svg+xml` favicon in `<head>` in `index.html` (browser tab)

## When something goes wrong

If a request to `API_BASE` fails — backend not running, wrong port, CORS
error, server error, timeout — the page you're on shows the **specific
endpoint and status** in red instead of a vague message, e.g.:

```
/predict-features/a1b2c3 returned 404: Not Found
```

(or, if the backend never responded at all — e.g. it's not running —
something like `/songs returned failed: Network error`). This shows up
inline in red text where the failed data would have gone, or as a toast
for button actions like Predict Features or Add Song. `apiCall()` in
`utils.js` is what builds this message and returns it as `error`; every
page checks `error` and passes it straight to `errorStateHTML(error)` or
`showToast(error, 'error')` rather than inventing its own wording.

The sidebar's **API Status** indicator (`js/apiStatus.js`) gives you an
at-a-glance signal without opening the console: a green dot + "API Active"
means the last check succeeded, a red dot + "API Offline / Unreachable"
means it didn't. It re-checks automatically every 30 seconds.

## Making changes safely

- **Changing colors/spacing/fonts?** Only edit `css/style.css`. It won't
  break any functionality — it's pure appearance.
- **Backend added a new field, or renamed one?**
  - New/renamed audio feature → edit `FEATURE_DEFS` in `js/featureForm.js`.
  - New/renamed/removed route → edit `js/config.js` (`ENDPOINTS`).
  - New/renamed song field → see "Field names" below for every place to update.
- **Backend endpoint changed shape (e.g. returns different field names)?**
  Look at the code that reads the response in the matching file
  (e.g. `home.js` for `/songs`, `songModal.js` for `/recommend/{track_id}`,
  `/song/{track_id}`, and `/predict-features/{track_id}`) and update the
  field names it reads.
- **Adding a whole new page?** Add a `<section class="page" id="page-yourpage">`
  in `index.html`, a matching sidebar button with `data-page="yourpage"`,
  and a new `js/yourpage.js` file — then add it to the `<script>` list at
  the bottom of `index.html`.
- **Adding a new tab to the song detail popup?** Add a
  `<button class="modal-tab" data-tab="yourtab">` inside `.modal-tabs` in
  `index.html`, then add a matching branch in `renderModalTab()` in
  `js/songModal.js` that fills in `#modalBody`.

## Load order (why it matters)

Because there's no bundler, the browser loads and runs each `<script>` tag
top-to-bottom, in the order they appear in `index.html`. Files that define
shared things (config, helpers, the shared feature-slider form) must load
**before** the page files that use them:

```
env.js → config.js → apiStatus.js → utils.js → featureForm.js → navigation.js
→ home.js → search.js → songModal.js → (Spotify iFrame API, async)
→ addSong.js → main.js  (runs init() last, after everything else is defined)
```

The Spotify iFrame API `<script>` tag (loaded from `open.spotify.com`) is
placed right after `songModal.js` on purpose: `songModal.js` defines
`window.onSpotifyIframeApiReady`, which that script calls once it's
finished loading — that function has to exist first.

If you add a new shared helper, put its `<script>` tag before the pages
that use it. If you're not sure, the safest place for a new *shared* file
is right after `utils.js`; the safest place for a new *page* file is right
before `main.js`.

## Field names — matching the real backend

Every song object that flows through the app uses the **same field names
the backend returns**, because `home.js` is written to read exactly these.
The full schema (matches the well-known "Spotify Tracks Dataset"):

```
track_id, artists, album_name, track_name, popularity, duration_ms,
explicit, danceability, energy, key, loudness, mode, speechiness,
acousticness, instrumentalness, liveness, valence, tempo, time_signature,
track_genre, track_youtube_link
```

| Field                 | Meaning                                  |
|------------------------|-------------------------------------------|
| `track_id`             | Unique song id — used for row clicks, the popup, the recommend/predict calls, and (assumed to double as) the Spotify track ID |
| `track_name`           | Song title                                |
| `artists`              | Artist name(s)                            |
| `album_name`           | Album name                                |
| `track_genre`          | Genre, shown in the song table badge and used for the "Genres" stat |
| `duration_ms`          | Duration in **milliseconds** — `fmtDuration()` in `utils.js` expects milliseconds and converts it for display, so always pass `duration_ms` straight through, not a pre-divided value |
| `popularity`           | 0–100 popularity score, used for the "Avg. Popularity" stat |
| `explicit`             | Boolean, shown as Yes/No in the Song Features tab |
| `track_youtube_link`   | A ready-to-embed YouTube URL, used directly by the popup's YouTube tab |
| 12 audio features      | `danceability`, `energy`, `key`, `loudness`, `mode`, `speechiness`, `acousticness`, `instrumentalness`, `liveness`, `valence`, `tempo`, `time_signature` — all **flat, top-level fields directly on the song object** (see `FEATURE_DEFS` in `featureForm.js`) |

**Important:** the 12 audio features are flat fields on the song, the same
as `track_name` or `popularity` — there is **no nested `features` object**.
`extractFeatures(song)` in `featureForm.js` is the one place that gathers
them into their own object (for sending to `POST /predict-features/{track_id}`); it
reads each one straight off `song[key]`.

**If your backend uses a different identifier field name** (e.g. plain
`id` instead of `track_id`), that's an easy but important thing to get
wrong — every `data-id="..."` attribute and every `track_id` lookup
throughout the app needs to match it exactly, or clicking a song will
silently do nothing (or open the wrong song).

**If your backend's song shape ever changes** (renamed/added/removed
field), update it in all of these places together:
- `home.js` (`songRowHTML`, `renderStatStrip`) — the primary reference for
  field names
- `songModal.js` (`openSongModal`, `switchToSong`, `renderRecommendList`,
  `renderFeaturesTab` — including the `payload` it builds for `updateSong`,
  `renderYouTubeTab`, `mountSpotifyEmbed`)
- `featureForm.js` (`FEATURE_DEFS`, `extractFeatures`)
- `addSong.js` (the `payload` object sent to `POST /songs`)

## Add Song page — no release year

The "Add Song" form does **not** collect a release year. Songs added
through this page are sent with a title, artist, album, genre, duration,
whether it's explicit, and all 12 audio features (see "Field names"
above) — matching the real backend schema field-for-field, with the
features sent as flat top-level values rather than nested under a
"features" key.

## Learning more (beginner-friendly resources)

If you're new to web frontend basics, these are solid, widely-used, free
references:

- **HTML**
  - [W3Schools HTML Tutorial](https://www.w3schools.com/html/)
  - [MDN: HTML basics](https://developer.mozilla.org/en-US/docs/Learn/HTML)
- **CSS**
  - [W3Schools CSS Tutorial](https://www.w3schools.com/css/)
  - [MDN: CSS basics](https://developer.mozilla.org/en-US/docs/Learn/CSS)
  - [CSS Variables (custom properties)](https://www.w3schools.com/css/css3_variables.asp) — used throughout `style.css`
- **JavaScript**
  - [W3Schools JavaScript Tutorial](https://www.w3schools.com/js/)
  - [MDN: JavaScript basics](https://developer.mozilla.org/en-US/docs/Learn/JavaScript)
  - [MDN: `fetch()`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) — how `apiCall()` in `utils.js` talks to the backend
  - [MDN: `async`/`await`](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Async_await) — used everywhere the app waits on the backend
- **Spotify iFrame API** (used by the Spotify tab in the song popup)
  - [Official tutorial](https://developer.spotify.com/documentation/embeds/tutorials/using-the-iframe-api)

You don't need to read all of these front-to-back. Skim the HTML and CSS
tutorials for the tags/properties you don't recognize in `index.html` /
`style.css`, and focus your JS learning on `fetch`, `async`/`await`, and
DOM basics (`document.getElementById`, `addEventListener`) — that covers
essentially everything this codebase does.
