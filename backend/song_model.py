from pydantic import BaseModel
from typing import Optional


class SongModel(BaseModel):
    track_id: str
    artists: str
    album_name: str
    track_name: str
    popularity: int
    duration_ms: int
    explicit: str
    danceability: float
    energy: float
    key: int
    loudness: float
    mode: int
    speechiness: float
    acousticness: float
    instrumentalness: float
    liveness: float
    valence: float
    tempo: float
    time_signature: int
    track_genre: str
    track_youtube_id: str


class SongUpdate(BaseModel):
    track_youtube_id: Optional[str] = None
    artists: Optional[str] = None
    album_name: Optional[str] = None
    track_name: Optional[str] = None
    popularity: Optional[int] = None
    duration_ms: Optional[int] = None
    explicit: Optional[str] = None
    danceability: Optional[float] = None
    energy: Optional[float] = None
    key: Optional[int] = None
    loudness: Optional[float] = None
    mode: Optional[int] = None
    speechiness: Optional[float] = None
    acousticness: Optional[float] = None
    instrumentalness: Optional[float] = None
    liveness: Optional[float] = None
    valence: Optional[float] = None
    tempo: Optional[float] = None
    time_signature: Optional[int] = None
    track_genre: Optional[str] = None



