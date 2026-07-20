from os import getenv

from dotenv import load_dotenv
import psycopg
from psycopg.rows import dict_row

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .song_model import SongUpdate

load_dotenv()

DATABASE_URL = getenv("DATABASE_URL")

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
    # TODO: Replace with KNN recommender
    return all_songs()[:10]


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
