```markdown
# Project: Music Recommendation System 2.0

## Objective

Build and deploy a full-stack music recommendation web application that allows users to search songs, receive recommendations, predict song attributes, and manage a music database.

## Tech Stack

- **Database:** SQLite
- **Backend:** FastAPI
- **Machine Learning:** Scikit-learn
- **Frontend:** HTML, CSS, JavaScript
- **Deployment:** Render

## Machine Learning Components

### Recommendation
- Recommend 10 similar songs using **K-Nearest Neighbors** with **cosine similarity**.

### Genre Classification
- Predict the genre of a new song using a **Decision Tree Classifier**.

### Popularity Prediction
- Predict a song's popularity score using the better-performing model between:
  - KNN Regressor
  - Decision Tree Regressor

## API Endpoints

### `GET /songs`
Returns all songs in the database.

### `GET /songs/search?q=<query>`
Search for songs by title or artist.

### `GET /recommend/{song_id}`
Returns the 10 most similar songs.

### `POST /predict-genre`
Predicts a song's genre from its audio features.

### `POST /predict-popularity`
Predicts a song's popularity score from its audio features.

### `POST /songs`
Adds a new song to the database.

## Frontend Features

- Search songs
- View song recommendations
- Predict genre
- Predict popularity
- Add new songs to the database

## Expected Outcome

A deployed web application that integrates:

- Data storage with SQLite
- Machine learning models
- REST APIs with FastAPI
- Interactive frontend
- Cloud deployment on Render
```
