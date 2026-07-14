from fastapi import FastAPI
import sqlite3

app = FastAPI()


def get_connection():
    conn=sqlite3.connect("C:/Users/hp/song-recommender/database/song_recommendations_db.db")
    return conn



@app.get("/songs")
def all_songs():
    conn=get_connection()
    cursor=conn.cursor()
    cursor.execute("SELECT * FROM songs limit 50")
    songs=cursor.fetchall()
    conn.close()
    print(songs)
    print(type(songs))
    return songs

