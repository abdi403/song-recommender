from anyio.streams import stapled
import psycopg
from psycopg.rows import dict_row

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .song_model import SongUpdate
import os
import pickle 
from pathlib import Path
import joblib
import pandas as pd 


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model.pkl"
SONG_PATH = BASE_DIR / "songs.pkl"

DATABASE_URL = os.environ["DATABASE_URL"]


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_connection():
    return psycopg.connect(
        DATABASE_URL,
        row_factory=dict_row,
    )


def fetch_all(query: str, params: tuple = ()):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            return cur.fetchall()


def execute(query: str, params: tuple = ()):

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            conn.commit()
            return cur.rowcount


# --------------------------
# Endpoints
# --------------------------



@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "Song Recommendation API"
    }

@app.get("songs/{track_id}")
def get_song_by_id(track_id: str):
    return fetch_all(
        "SELECT * FROM songs WHERE track_id = %s",
        (track_id,),
    )

@app.get("/songs")
def all_songs():
    return fetch_all(
        "SELECT * FROM songs ORDER BY RANDOM() LIMIT 50"
    )


@app.get("/songs/search")
def search_songs(q: str):
    search = f"%{q}%"

    return fetch_all(
        """
        SELECT *
        FROM songs
        WHERE artists ILIKE %s
           OR track_name ILIKE %s
        ORDER BY popularity DESC
        """,
        (search, search),
    )


@app.get("/recommend/{track_id}")
def recommend(track_id: str):
    print(MODEL_PATH)
    model = joblib.load(MODEL_PATH)
    song_features = pd.DataFrame(get_song_by_id(track_id))
    feature_keys=['popularity','duration_ms','danceability','energy','key','loudness','mode','speechiness','acousticness','instrumentalness','liveness','valence','tempo','time_signature']
    print(song_features[feature_keys])
    distances, indices = model.kneighbors(song_features[feature_keys])
    songs_table= joblib.load(SONG_PATH)
    recommended_songs = songs_table.iloc[indices[0]]
    return recommended_songs.to_dict(orient="records")


@app.get("/predict-features/{track_id}")
def predict_features(track_id: str):
    # TODO: Replace with ML model
    return {
        "track_id": track_id,
        "genre": "acoustic",
        "popularity": 200,
    }


@app.patch("/song/{track_id}")
def update_song(track_id: str, updates: SongUpdate):
    """
    Partially update a song.

    Only the fields supplied by the client are updated.
    """

    update_data = updates.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No fields supplied for update."
        )

    set_clause = ", ".join(f"{field} = %s" for field in update_data)

    values = list(update_data.values())
    values.append(track_id)

    rows_updated = execute(
        f"""
        UPDATE songs
        SET {set_clause}
        WHERE track_id = %s
        """,
        tuple(values),
    )

    if rows_updated == 0:
        raise HTTPException(
            status_code=404,
            detail="Song not found."
        )

    return {
        "message": "Song updated successfully.",
        "track_id": track_id,
        "updated_fields": list(update_data.keys()),
    }


@app.post("/songs")
def add_songs(song:SongUpdate):
    query ="""Insert into songs(
        track_id,
        track_name, 
        artists,
        track_genre) 
    values (%s,%s,%s,%s) returning track_id"""
    song_inserted = execute(query, (song.track_id,song.track_name,song.artists,song.track_genre))
    print(song_inserted)
    if song_inserted:
        return {"message":f"{song_inserted} was Inserted"}
    else:
        return {"message": "insert failed"}





