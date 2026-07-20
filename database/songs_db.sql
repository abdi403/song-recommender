CREATE TABLE IF NOT EXISTS songs (

    track_id TEXT PRIMARY KEY,

    artists TEXT,
    album_name TEXT,
    track_name TEXT,

    popularity INTEGER,
    duration_ms INTEGER,

    explicit TEXT,

    danceability DOUBLE PRECISION,
    energy DOUBLE PRECISION,

    key INTEGER,

    loudness DOUBLE PRECISION,

    mode INTEGER,

    speechiness DOUBLE PRECISION,
    acousticness DOUBLE PRECISION,
    instrumentalness DOUBLE PRECISION,
    liveness DOUBLE PRECISION,
    valence DOUBLE PRECISION,

    tempo DOUBLE PRECISION,

    time_signature INTEGER,

    track_genre TEXT,

    track_youtube_id TEXT
);






