import os
import sys
import requests
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Depends, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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

# Konfiguracja security
security = HTTPBearer()

app = FastAPI(title="Movies Service", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # W produkcji ustaw konkretne domeny
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# Funkcje pomocnicze
def get_db_connection():
    client = get_client()
    db = get_db(client)
    return db

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Weryfikuje token przez auth service"""
    try:
        headers = {"Authorization": f"Bearer {credentials.credentials}"}
        response = requests.get(f"{AUTH_SERVICE_URL}/me", headers=headers, timeout=5)
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return response.json()
    except requests.RequestException:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth service unavailable"
        )

def parse_date(date_field):
    """Parsuje pole daty z MongoDB - ulepszona wersja"""
    try:
        # Debug: loguj typ i wartość
        print(f"Parsing date field: {type(date_field)} -> {date_field}")
        
        if isinstance(date_field, dict):
            if '$date' in date_field:
                # Format MongoDB z $date
                date_str = date_field['$date']
                if isinstance(date_str, str):
                    return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                elif isinstance(date_str, dict) and '$numberLong' in date_str:
                    # Timestamp w milisekundach
                    timestamp = int(date_str['$numberLong']) / 1000
                    return datetime.fromtimestamp(timestamp)
            elif '$numberLong' in date_field:
                # Bezpośredni timestamp
                timestamp = int(date_field['$numberLong']) / 1000
                return datetime.fromtimestamp(timestamp)
        elif isinstance(date_field, datetime):
            # Już jest obiektem datetime
            return date_field
        elif isinstance(date_field, str):
            # String ISO format
            return datetime.fromisoformat(date_field.replace('Z', '+00:00'))
        elif isinstance(date_field, (int, float)):
            # Unix timestamp
            return datetime.fromtimestamp(date_field)
        
        # Fallback - aktualna data
        print(f"Warning: Could not parse date field {date_field}, using current time")
        return datetime.now()
        
    except Exception as e:
        print(f"Error parsing date {date_field}: {e}")
        return datetime.now()

def movie_to_response(movie_doc) -> MovieResponse:
    """Konwertuje dokument MongoDB na MovieResponse"""
    try:
        # Debug: sprawdź strukturę dokumentu
        print(f"Converting movie: {movie_doc.get('title', 'Unknown')} - addedDate: {movie_doc.get('addedDate', 'Missing')}")
        
        return MovieResponse(
            id=str(movie_doc["_id"]),
            title=movie_doc["title"],
            year=movie_doc["year"],
            genres=movie_doc["genres"],
            language=movie_doc["language"],
            country=movie_doc["country"],
            duration=movie_doc["duration"],
            description=movie_doc["description"],
            director=movie_doc["director"],
            rating=movie_doc["rating"],
            actors=movie_doc["actors"],
            addedDate=parse_date(movie_doc["addedDate"]),
            is_available=movie_doc["is_available"]
        )
    except Exception as e:
        print(f"Error converting movie document: {e}")
        print(f"Movie document: {movie_doc}")
        raise

# Endpointy
@app.get("/")
def read_root():
    return {"message": "Movies Service is running"}

@app.get("/movies", response_model=MoviesListResponse)
async def get_movies(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(10, ge=1, le=100, description="Items per page"),
    genre: Optional[str] = Query(None, description="Filter by genre"),
    year: Optional[int] = Query(None, description="Filter by year"),
    available_only: bool = Query(True, description="Show only available movies"),
    search: Optional[str] = Query(None, description="Search in title, director, or actors"),
    current_user: dict = Depends(verify_token)
):
    """Pobiera listę filmów z paginacją i filtrami"""
    db = get_db_connection()
    
    # Buduj filtr
    filter_query = {}
    
    if available_only:
        filter_query["is_available"] = True
    
    if genre:
        filter_query["genres"] = {"$in": [genre]}
    
    if year:
        filter_query["year"] = year
    
    if search:
        filter_query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"director": {"$regex": search, "$options": "i"}},
            {"actors": {"$in": [{"$regex": search, "$options": "i"}]}}
        ]
    
    # Policz całkowitą liczbę dokumentów
    total = db.Movies.count_documents(filter_query)
    
    # Oblicz paginację
    skip = (page - 1) * per_page
    total_pages = (total + per_page - 1) // per_page
    
    # Pobierz filmy
    movies_cursor = db.Movies.find(filter_query).skip(skip).limit(per_page).sort("addedDate", -1)
    movies = [movie_to_response(movie) for movie in movies_cursor]
    
    return MoviesListResponse(
        movies=movies,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )

@app.get("/movies/{movie_id}", response_model=MovieResponse)
async def get_movie(
    movie_id: str,
    current_user: dict = Depends(verify_token)
):
    """Pobiera szczegóły konkretnego filmu"""
    db = get_db_connection()
    
    try:
        movie = db.Movies.find_one({"_id": ObjectId(movie_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid movie ID format"
        )
    
    if not movie:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Movie not found"
        )
    
    return movie_to_response(movie)

@app.get("/genres")
async def get_genres(current_user: dict = Depends(verify_token)):
    """Pobiera listę wszystkich gatunków"""
    db = get_db_connection()
    
    genres = db.Movies.distinct("genres")
    return {"genres": sorted(genres)}

@app.get("/health")
def health_check():
    try:
        db = get_db_connection()
        db.command("ping")
        
        # Sprawdź połączenie z auth service
        auth_status = "unknown"
        try:
            response = requests.get(f"{AUTH_SERVICE_URL}/health", timeout=5)
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)