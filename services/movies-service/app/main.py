import logging
import asyncio
from functools import partial
import httpx
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Depends, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import sys
import requests
from pydantic import BaseModel
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv


# Dodaj ścieżkę do shared
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))
from database import get_client, get_db

load_dotenv()

# Konfiguracja
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8000")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("movies-service")


# Konfiguracja security
security = HTTPBearer()

app = FastAPI(title="Movies Service", version="1.0.0")

# CORS jak wcześniej...
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Globalne zasoby trzymane w app.state
@app.on_event("startup")
async def startup_event():
    # MongoClient singleton z database.get_client
    from database import get_client, get_db
    app.state.mongo_client = get_client()
    app.state.db = get_db(app.state.mongo_client)

    

    # w funkcji startup lub zaraz po połączeniu z bazą
    try:
        await db.Movies.create_index([
            ("title", "text"),
            ("description", "text"),
            ("director", "text"),
            ("actors", "text")
        ])
        logger.info("Text index created successfully for Movies collection")
    except Exception as e:
        logger.warning(f"Could not create text index: {e}")
# Stwórz indeksy (w tle) — mogą przyspieszyć zapytania filtrujące/szukające
    try:
        movies = app.state.db.Movies
        # indeksy pola, plus text index dla wyszukiwania
        movies.create_index([("year", 1)], background=True)
        movies.create_index([("genres", 1)], background=True)
        movies.create_index([("is_available", 1)], background=True)
        # text index dla wyszukiwania w title/director/actors
        movies.create_index(
    [("title", "text"), ("director", "text"), ("actors", "text")],
    default_language="none",
    background=True
)

        logger.info("Mongo indexes ensured")
    except Exception as e:
        logger.warning(f"Could not create indexes at startup: {e}")

    # httpx AsyncClient z connection pooling — będziemy go używać do komunikacji z auth service
    app.state.http_client = httpx.AsyncClient(timeout=5.0, limits=httpx.Limits(max_keepalive_connections=10, max_connections=50))

@app.on_event("shutdown")
async def shutdown_event():
    # close httpx client and mongo
    try:
        await app.state.http_client.aclose()
    except Exception:
        pass
    try:
        app.state.mongo_client.close()
    except Exception:
        pass


# Modele Pydantic
class MovieResponse(BaseModel):
    id: str
    title: str
    year: int
    genres: List[str]
    language: str
    country: str
    duration: int
    description: str
    director: str
    rating: float
    actors: List[str]
    addedDate: datetime
    is_available: bool

class MoviesListResponse(BaseModel):
    movies: List[MovieResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

class MovieCreate(BaseModel):
    title: str
    year: int
    genres: List[str]
    language: str
    country: str
    duration: int
    description: str
    director: str
    rating: float
    actors: List[str]
    is_available: bool = True

class MovieUpdate(BaseModel):
    title: Optional[str] = None
    year: Optional[int] = None
    genres: Optional[List[str]] = None
    language: Optional[str] = None
    country: Optional[str] = None
    duration: Optional[int] = None
    description: Optional[str] = None
    director: Optional[str] = None
    rating: Optional[float] = None
    actors: Optional[List[str]] = None
    is_available: Optional[bool] = None

# Funkcje pomocnicze
def get_db_connection():
    return app.state.db

async def run_blocking(func, *args, **kwargs):
    loop = asyncio.get_event_loop()
    p = partial(func, *args, **kwargs)
    return await loop.run_in_executor(None, p)

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Weryfikuje token przez auth service asynchronicznie (httpx)."""
    token = credentials.credentials
    headers = {"Authorization": f"Bearer {token}"}
    try:
        resp = await app.state.http_client.get(f"{AUTH_SERVICE_URL}/me", headers=headers)
        if resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return resp.json()
    except httpx.RequestError as e:
        logger.warning(f"Auth service request failed: {e}")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Auth service unavailable")

async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await verify_token(credentials)
    if user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access forbidden. Admin role required.")
    return user

def parse_date(date_field):
    try:
        if isinstance(date_field, dict):
            if '$date' in date_field:
                date_str = date_field['$date']
                if isinstance(date_str, str):
                    return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                elif isinstance(date_str, dict) and '$numberLong' in date_str:
                    timestamp = int(date_str['$numberLong']) / 1000
                    return datetime.fromtimestamp(timestamp)
            elif '$numberLong' in date_field:
                timestamp = int(date_field['$numberLong']) / 1000
                return datetime.fromtimestamp(timestamp)
        elif isinstance(date_field, datetime):
            return date_field
        elif isinstance(date_field, str):
            return datetime.fromisoformat(date_field.replace('Z', '+00:00'))
        elif isinstance(date_field, (int, float)):
            return datetime.fromtimestamp(date_field)
        logger.debug(f"Could not parse date field {date_field}, using now")
        return datetime.now()
    except Exception as e:
        logger.exception("Error parsing date")
        return datetime.now()

def movie_to_response(movie_doc) -> MovieResponse:
    try:
        return MovieResponse(
            id=str(movie_doc["_id"]),
            title=movie_doc.get("title", ""),
            year=movie_doc.get("year", 0),
            genres=movie_doc.get("genres", []),
            language=movie_doc.get("language", ""),
            country=movie_doc.get("country", ""),
            duration=movie_doc.get("duration", 0),
            description=movie_doc.get("description", ""),
            director=movie_doc.get("director", ""),
            rating=movie_doc.get("rating", 0.0),
            actors=movie_doc.get("actors", []),
            addedDate=parse_date(movie_doc.get("addedDate")),
            is_available=movie_doc.get("is_available", False)
        )
    except Exception as e:
        logger.exception("Error converting movie document")
        raise


# Endpointy
@app.get("/")
def read_root():
    return {"message": "Movies Service is running"}


# Prosty cache in-memory z TTL
_movies_cache = {}
_cache_lock = asyncio.Lock()
CACHE_TTL = 5  # seconds

def _cache_key(**kwargs):
    # proste kluczowanie - dobierz według potrzeb (page/per_page/filters)
    return str(sorted(kwargs.items()))

@app.get("/movies", response_model=MoviesListResponse)
async def get_movies(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    genre: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    available_only: bool = Query(True),
    search: Optional[str] = Query(None),
    current_user: dict = Depends(verify_token)
):
    db = get_db_connection()
    filter_query = {}
    if available_only:
        filter_query["is_available"] = True
    if genre:
        filter_query["genres"] = {"$in": [genre]}
    if year:
        filter_query["year"] = year
    if search:
        # wykorzystujemy text index jeśli istnieje
        filter_query["$text"] = {"$search": search}

    key = _cache_key(page=page, per_page=per_page, **filter_query)

    # sprawdź cache
    async with _cache_lock:
        cached = _movies_cache.get(key)
        if cached and (datetime.utcnow().timestamp() - cached["ts"] < CACHE_TTL):
            return cached["value"]

    skip = (page - 1) * per_page

    # policz total i pobierz filmy w executorze (pymongo sync)
    total = await run_blocking(db.Movies.count_documents, filter_query)
    total_pages = (total + per_page - 1) // per_page

    # projekcja - tylko potrzebne pola (zmniejsza transfer)
    projection = {
        "title": 1,
        "year": 1,
        "genres": 1,
        "language": 1,
        "country": 1,
        "duration": 1,
        "description": 1,
        "director": 1,
        "rating": 1,
        "actors": 1,
        "addedDate": 1,
        "is_available": 1
    }

    cursor = db.Movies.find(filter_query, projection).skip(skip).limit(per_page).sort("addedDate", -1)
    movies_list = await run_blocking(list, cursor)  # pobierz listę dokumentów w executorze

    movies = [movie_to_response(m) for m in movies_list]

    result = MoviesListResponse(
        movies=movies,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )

    # zapisz do cache
    async with _cache_lock:
        _movies_cache[key] = {"ts": datetime.utcnow().timestamp(), "value": result}

    return result


@app.get("/movies/{movie_id}", response_model=MovieResponse)
async def get_movie(movie_id: str, current_user: dict = Depends(verify_token)):
    db = get_db_connection()
    try:
        from bson import ObjectId
        object_id = ObjectId(movie_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid movie ID format")

    movie = await run_blocking(db.Movies.find_one, {"_id": object_id})
    if not movie:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movie not found")
    return movie_to_response(movie)

@app.get("/genres")
async def get_genres(current_user: dict = Depends(verify_token)):
    """Pobiera listę wszystkich gatunków"""
    db = get_db_connection()
    
    genres = await run_blocking(db.Movies.distinct, "genres")

    return {"genres": sorted(genres)}

@app.get("/health")
async def health_check():
    try:
        db = get_db_connection()
        db.command("ping")
        
        # Sprawdź połączenie z auth service
        auth_status = "unknown"
        try:
            response = await app.state.http_client.get(f"{AUTH_SERVICE_URL}/health")
            auth_status = "connected" if response.status_code == 200 else "error"
        except:
            auth_status = "disconnected"
        
        return {
            "status": "healthy",
            "database": "connected",
            "auth_service": auth_status
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }
    
@app.post("/movies", response_model=MovieResponse)
async def create_movie(movie_data: MovieCreate, current_user: dict = Depends(require_admin)):
    db = get_db_connection()
    new_movie = {
        "title": movie_data.title,
        "year": movie_data.year,
        "genres": movie_data.genres,
        "language": movie_data.language,
        "country": movie_data.country,
        "duration": movie_data.duration,
        "description": movie_data.description,
        "director": movie_data.director,
        "rating": movie_data.rating,
        "actors": movie_data.actors,
        "addedDate": datetime.utcnow(),
        "is_available": movie_data.is_available
    }
    result = await run_blocking(db.Movies.insert_one, new_movie)
    new_movie["_id"] = result.inserted_id
    return movie_to_response(new_movie)


@app.put("/movies/{movie_id}", response_model=MovieResponse)
async def update_movie(
    movie_id: str,
    movie_data: MovieUpdate,
    current_user: dict = Depends(require_admin)
):
    """Aktualizuje film (tylko admin)"""
    db = get_db_connection()
    
    try:
        object_id = ObjectId(movie_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid movie ID format"
        )
    
    # Sprawdź czy film istnieje
    existing_movie = await run_blocking(db.Movies.find_one, {"_id": object_id})
    if not existing_movie:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Movie not found"
        )
    
    # Przygotuj dane do aktualizacji
    update_fields = {}
    
    if movie_data.title is not None:
        update_fields["title"] = movie_data.title
    if movie_data.year is not None:
        update_fields["year"] = movie_data.year
    if movie_data.genres is not None:
        update_fields["genres"] = movie_data.genres
    if movie_data.language is not None:
        update_fields["language"] = movie_data.language
    if movie_data.country is not None:
        update_fields["country"] = movie_data.country
    if movie_data.duration is not None:
        update_fields["duration"] = movie_data.duration
    if movie_data.description is not None:
        update_fields["description"] = movie_data.description
    if movie_data.director is not None:
        update_fields["director"] = movie_data.director
    if movie_data.rating is not None:
        update_fields["rating"] = movie_data.rating
    if movie_data.actors is not None:
        update_fields["actors"] = movie_data.actors
    if movie_data.is_available is not None:
        update_fields["is_available"] = movie_data.is_available
    
    # Aktualizuj w bazie
    if update_fields:
        await run_blocking(db.Movies.update_one, {"_id": object_id}, {"$set": update_fields})
    
    # Pobierz zaktualizowany film
    updated_movie = await run_blocking(db.Movies.find_one, {"_id": object_id})

    return movie_to_response(updated_movie)

@app.delete("/movies/{movie_id}")
async def delete_movie(
    movie_id: str,
    current_user: dict = Depends(require_admin)
):
    """Usuwa film (tylko admin)"""
    db = get_db_connection()
    
    try:
        object_id = ObjectId(movie_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid movie ID format"
        )
    
    result = await run_blocking(db.Movies.delete_one, {"_id": object_id})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Movie not found"
        )
    
    return {"message": "Movie deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)