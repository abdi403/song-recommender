from pathlib import Path
import sqlite3

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .song_model import SongModel, SongUpdate


app = FastAPI()


# Database location
ROOT_DIR = Path(__file__).resolve().parent.parent
DATABASE_PATH = ROOT_DIR / "database" / "song_recommendations_db.db"


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------
# Database helpers
# --------------------------

def get_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def fetch_all(query: str, params: tuple = ()):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]


def execute(query: str, params: tuple = ()) -> int:
    """
    Executes INSERT/UPDATE/DELETE statements.

    Returns:
        Number of rows affected.
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        conn.commit()
        return cursor.rowcount


# --------------------------
# Endpoints
# --------------------------

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
        WHERE artists LIKE ?
           OR track_name LIKE ?
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

    set_clause = ", ".join(f"{field} = ?" for field in update_data)

    values = list(update_data.values())
    values.append(track_id)

    rows_updated = execute(
        f"""
        UPDATE songs
        SET {set_clause}
        WHERE track_id = ?
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
