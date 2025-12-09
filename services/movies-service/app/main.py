import logging
import asyncio
from functools import partial
import httpx
from datetime import datetime
from datetime import timedelta
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Depends, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import requests
from pydantic import BaseModel
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv


# Import z shared 
from shared.database import get_client, get_db

load_dotenv()

# Konfiguracja
AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8000")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("movies-service")


# Konfiguracja security
security = HTTPBearer()

app = FastAPI(title="Movies Service", version="1.0.0")

# CORS Middleware
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
    app.state.mongo_client = get_client()
    app.state.db = get_db(app.state.mongo_client)

    # Tworzenie indeksów

    try:
        movies = app.state.db.Movies
        # Indeksy dla innych pól - w tle
        await run_blocking(movies.create_index, [("year", 1)], background=True)
        await run_blocking(movies.create_index, [("genres", 1)], background=True)
        await run_blocking(movies.create_index, [("is_available", 1)], background=True)

        logger.info("Mongo indexes ensured")
    except Exception as e:
        logger.warning(f"Could not create indexes at startup: {e}")

    # httpx AsyncClient z connection pooling na auth service
    app.state.http_client = httpx.AsyncClient(
        timeout=5.0,
        limits=httpx.Limits(max_keepalive_connections=10, max_connections=50)
    )


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

def rental_to_dict(rental):
    out = rental.copy()
    out["_id"] = str(out["_id"])
    
    # Konwertuj ObjectId na string dla clientId i movieId
    if "clientId" in out and isinstance(out["clientId"], ObjectId):
        out["clientId"] = str(out["clientId"])
    if "movieId" in out and isinstance(out["movieId"], ObjectId):
        out["movieId"] = str(out["movieId"])
    
    # Konwertuj daty na ISO
    if "rentalDate" in out:
        out["rentalDate"] = out["rentalDate"].isoformat() if out["rentalDate"] else None
    if "plannedReturnDate" in out:
        out["plannedReturnDate"] = out["plannedReturnDate"].isoformat() if out["plannedReturnDate"] else None
    if "actualReturnDate" in out and out["actualReturnDate"]:
        out["actualReturnDate"] = out["actualReturnDate"].isoformat()
    if "returnRequestDate" in out and out["returnRequestDate"]:
        out["returnRequestDate"] = out["returnRequestDate"].isoformat()
    return out

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
    # proste kluczowanie
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
        # Użyj regex dla wyszukiwania
        filter_query["title"] = {"$regex": search, "$options": "i"}

    key = _cache_key(page=page, per_page=per_page, **filter_query)

    # sprawdź cache
    async with _cache_lock:
        cached = _movies_cache.get(key)
        if cached and (datetime.utcnow().timestamp() - cached["ts"] < CACHE_TTL):
            return cached["value"]

    skip = (page - 1) * per_page

    # policz total i pobierz filmy w executorze 
    total = await run_blocking(db.Movies.count_documents, filter_query)
    total_pages = (total + per_page - 1) // per_page

    # projekcja - tylko potrzebne pola
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

    if year is not None:
        if year < 1800 or year > datetime.utcnow().year:
            raise HTTPException(status_code=400, detail="Invalid year filter")
        filter_query["year"] = year

    if search:
        # Wersja z indeksowanym wyszukiwaniem tekstowym
        filter_query["$text"] = {"$search": search}
        # Alternatywnie na tytuł:
        # filter_query["title"] = {"$regex": search, "$options": "i"}

    skip = (page - 1) * per_page

    total = await run_blocking(db.Movies.count_documents, filter_query)
    total_pages = (total + per_page - 1) // per_page

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
    movies_list = await run_blocking(list, cursor)

    movies = [movie_to_response(m) for m in movies_list]

    result = MoviesListResponse(
        movies=movies,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )

    return result



@app.post("/rent/{movie_id}")
async def rent_movie(
    movie_id: str,
    current_user: dict = Depends(verify_token)
):
    db = get_db_connection()
    user_id = str(current_user["id"])  # <-- POPRAWKA: bierz zawsze "id"

    try:
        object_id = ObjectId(movie_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid movie ID")

    # Sprawdź czy użytkownik nie przekroczył limitu 3 aktywnych wypożyczeń
    active_rentals_count = await run_blocking(
        db.Rentals.count_documents,
        {"clientId": user_id, "status": "active"}
    )
    if active_rentals_count >= 3:
        raise HTTPException(
            status_code=400, 
            detail="Osiągnięto limit 3 aktywnych wypożyczeń. Zwróć film, aby wypożyczyć kolejny."
        )

    movie = await run_blocking(db.Movies.find_one, {"_id": object_id})
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    if not movie.get("is_available", True):
        raise HTTPException(status_code=400, detail="Movie not available for rent")

    # Sprawdź czy klient już wypożyczył ten film
    existing = await run_blocking(
        db.Rentals.find_one,
        {"clientId": user_id, "movieId": movie_id, "status": "active"}
    )
    if existing:
        raise HTTPException(status_code=400, detail="You already rented this movie")

    now = datetime.utcnow()
    rental = {
        "clientId": user_id,
        "movieId": movie_id,
        "movieTitle": movie.get("title"),
        "rentalDate": now,
        "plannedReturnDate": now + timedelta(days=2),  # np. 2 dni wypożyczenia
        "actualReturnDate": None,
        "status": "active",
    }

    await run_blocking(db.Rentals.insert_one, rental)

    # Zaktualizuj licznik aktywnych wypożyczeń klienta
    await run_blocking(
        db.Clients.update_one,
        {"_id": ObjectId(user_id)},
        {"$inc": {"activeRentalsCount": 1}}
    )

    # ustaw film jako niedostępny
    await run_blocking(
        db.Movies.update_one,
        {"_id": object_id},
        {"$set": {"is_available": False}}
    )

    return {"message": f"You rented '{movie.get('title')}' successfully"}


@app.post("/return/{movie_id}")
async def return_movie(
    movie_id: str,
    current_user: dict = Depends(verify_token)
):
    """Zgłoś chęć zwrotu filmu - wymaga zatwierdzenia przez admina"""
    db = get_db_connection()
    user_id = str(current_user["id"])  # <-- POPRAWKA: bierz zawsze "id"

    rental = await run_blocking(
        db.Rentals.find_one,
        {"clientId": user_id, "movieId": movie_id, "status": "active"}
    )
    if not rental:
        raise HTTPException(status_code=404, detail="No active rental found for this movie")

    # Ustaw status na "pending_return" - oczekuje na zatwierdzenie przez admina
    await run_blocking(
        db.Rentals.update_one,
        {"_id": rental["_id"]},
        {"$set": {"status": "pending_return", "returnRequestDate": datetime.utcnow()}}
    )

    return {"message": "Prośba o zwrot filmu została zgłoszona. Oczekuje na zatwierdzenie przez administratora."}


@app.get("/rentals/me")
async def get_my_rentals(current_user: dict = Depends(verify_token)):
    db = get_db_connection()
    user_id = str(current_user["id"])
    raw_rentals = await run_blocking(list, db.Rentals.find({"clientId": user_id}))
    rentals = [rental_to_dict(r) for r in raw_rentals]
    return rentals


@app.get("/rentals/pending")
async def get_pending_returns(current_user: dict = Depends(require_admin)):
    """Pobierz listę wypożyczeń oczekujących na zatwierdzenie zwrotu (tylko admin)"""
    db = get_db_connection()
    raw_rentals = await run_blocking(
        list, 
        db.Rentals.find({"status": "pending_return"}).sort("returnRequestDate", -1)
    )
    
    # Wzbogać o dane klienta
    rentals = []
    for rental in raw_rentals:
        rental_dict = rental_to_dict(rental)
        
        # Pobierz dane klienta
        client = await run_blocking(
            db.Clients.find_one,
            {"_id": ObjectId(rental["clientId"])}
        )
        if client:
            rental_dict["clientName"] = f"{client.get('firstName', '')} {client.get('lastName', '')}"
            rental_dict["clientEmail"] = client.get("email", "")
        
        rentals.append(rental_dict)
    
    return rentals


@app.post("/rentals/{rental_id}/approve")
async def approve_return(
    rental_id: str,
    current_user: dict = Depends(require_admin)
):
    """Zatwierdź zwrot filmu (tylko admin)"""
    db = get_db_connection()

    try:
        object_id = ObjectId(rental_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid rental ID")

    rental = await run_blocking(db.Rentals.find_one, {"_id": object_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Rental not found")

    if rental.get("status") != "pending_return":
        raise HTTPException(
            status_code=400, 
            detail="Rental is not pending return approval"
        )

    now = datetime.utcnow()
    
    # Zatwierdź zwrot
    await run_blocking(
        db.Rentals.update_one,
        {"_id": object_id},
        {"$set": {"status": "returned", "actualReturnDate": now}}
    )

    # Zaktualizuj licznik aktywnych wypożyczeń klienta
    await run_blocking(
        db.Clients.update_one,
        {"_id": ObjectId(rental["clientId"])},
        {"$inc": {"activeRentalsCount": -1}}
    )

    # Ustaw film jako dostępny
    await run_blocking(
        db.Movies.update_one,
        {"_id": ObjectId(rental["movieId"])},
        {"$set": {"is_available": True}}
    )

    return {"message": "Zwrot filmu został zatwierdzony"}


@app.delete("/rentals/{rental_id}")
async def delete_rental(
    rental_id: str,
    current_user: dict = Depends(verify_token)
):
    """Usuń wypożyczenie (tylko jeśli zostało zwrócone)"""
    db = get_db_connection()
    user_id = str(current_user["id"])

    try:
        object_id = ObjectId(rental_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid rental ID")

    rental = await run_blocking(
        db.Rentals.find_one,
        {"_id": object_id, "clientId": user_id}
    )
    
    if not rental:
        raise HTTPException(status_code=404, detail="Rental not found")

    # Sprawdź czy wypożyczenie zostało zwrócone
    if rental.get("status") != "returned":
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete active rental. Please return the movie first."
        )

    # Usuń wypożyczenie z bazy
    await run_blocking(db.Rentals.delete_one, {"_id": object_id})

    return {"message": "Rental deleted successfully"}


@app.get("/admin/rentals")
async def get_all_rentals(
    current_user: dict = Depends(require_admin),
    search: Optional[str] = Query(None, description="Szukaj po imieniu, nazwisku, emailu, tytule filmu"),
    sort_by: Optional[str] = Query("rentalDate", description="Sortuj po: rentalDate, clientName, movieTitle"),
    sort_order: Optional[str] = Query("desc", description="asc lub desc"),
    status_filter: Optional[str] = Query(None, description="Filtruj po statusie: active, pending_return, returned")
):
    """Pobierz wszystkie wypożyczenia z możliwością filtrowania i sortowania (tylko admin)"""
    db = get_db_connection()
    
    # Buduj query
    query = {}
    if status_filter:
        query["status"] = status_filter
    
    # Pobierz wszystkie wypożyczenia
    raw_rentals = await run_blocking(list, db.Rentals.find(query))
    
    # Wzbogać o dane klienta i filmu
    rentals = []
    for rental in raw_rentals:
        rental_dict = rental_to_dict(rental)
        
        # Pobierz dane klienta - obsłuż zarówno ObjectId jak i string
        try:
            client_id = rental["clientId"]
            # Jeśli to już ObjectId, użyj bezpośrednio, jeśli string - konwertuj
            if isinstance(client_id, str):
                client_id = ObjectId(client_id)
            
            client = await run_blocking(
                db.Clients.find_one,
                {"_id": client_id}
            )
            if client:
                rental_dict["clientFirstName"] = client.get("firstName", "")
                rental_dict["clientLastName"] = client.get("lastName", "")
                rental_dict["clientName"] = f"{client.get('firstName', '')} {client.get('lastName', '')}"
                rental_dict["clientEmail"] = client.get("email", "")
                rental_dict["clientPhone"] = client.get("phone", "")
        except Exception as e:
            logger.warning(f"Could not fetch client data: {e}")
            rental_dict["clientName"] = "Nieznany klient"
        
        # Pobierz dane filmu - obsłuż zarówno ObjectId jak i string
        try:
            movie_id = rental["movieId"]
            # Jeśli to już ObjectId, użyj bezpośrednio, jeśli string - konwertuj
            if isinstance(movie_id, str):
                movie_id = ObjectId(movie_id)
                
            movie = await run_blocking(
                db.Movies.find_one,
                {"_id": movie_id}
            )
            if movie:
                rental_dict["movieTitle"] = movie.get("title", rental_dict.get("movieTitle", ""))
                rental_dict["movieGenres"] = movie.get("genres", [])
        except Exception as e:
            logger.warning(f"Could not fetch movie data: {e}")
        
        rentals.append(rental_dict)
    
    # Filtrowanie po wyszukiwaniu
    if search:
        search_lower = search.lower()
        rentals = [r for r in rentals if (
            search_lower in r.get("clientFirstName", "").lower() or
            search_lower in r.get("clientLastName", "").lower() or
            search_lower in r.get("clientEmail", "").lower() or
            search_lower in r.get("movieTitle", "").lower() or
            search_lower in r.get("movieId", "")
        )]
    
    # Sortowanie
    reverse = (sort_order == "desc")
    if sort_by == "clientName":
        rentals.sort(key=lambda x: x.get("clientName", ""), reverse=reverse)
    elif sort_by == "movieTitle":
        rentals.sort(key=lambda x: x.get("movieTitle", ""), reverse=reverse)
    else:  # domyślnie rentalDate
        rentals.sort(key=lambda x: x.get("rentalDate", ""), reverse=reverse)
    
    return rentals


@app.post("/admin/rent")
async def admin_rent_movie(
    movie_id: str,
    client_identifier: str = Query(..., description="Email, ID klienta lub 'Imię Nazwisko'"),
    current_user: dict = Depends(require_admin)
):
    """Wypożycz film dla klienta (tylko admin)"""
    db = get_db_connection()
    
    # Znajdź klienta po email, ID lub imieniu+nazwisku
    client = None
    
    # Sprawdź czy to ObjectId
    try:
        client = await run_blocking(
            db.Clients.find_one,
            {"_id": ObjectId(client_identifier)}
        )
    except:
        pass
    
    # Sprawdź czy to email
    if not client:
        client = await run_blocking(
            db.Clients.find_one,
            {"email": client_identifier}
        )
    
    # Sprawdź czy to imię i nazwisko
    if not client and " " in client_identifier:
        parts = client_identifier.strip().split(" ", 1)
        if len(parts) == 2:
            first_name, last_name = parts
            client = await run_blocking(
                db.Clients.find_one,
                {"firstName": {"$regex": f"^{first_name}$", "$options": "i"},
                 "lastName": {"$regex": f"^{last_name}$", "$options": "i"}}
            )
    
    if not client:
        raise HTTPException(status_code=404, detail="Klient nie znaleziony")
    
    client_id = str(client["_id"])
    
    # Sprawdź film
    try:
        movie_object_id = ObjectId(movie_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid movie ID")
    
    movie = await run_blocking(db.Movies.find_one, {"_id": movie_object_id})
    if not movie:
        raise HTTPException(status_code=404, detail="Film nie znaleziony")
    
    if not movie.get("is_available", True):
        raise HTTPException(status_code=400, detail="Film nie jest dostępny do wypożyczenia")
    
    # Sprawdź limit wypożyczeń klienta
    active_rentals_count = await run_blocking(
        db.Rentals.count_documents,
        {"clientId": client_id, "status": "active"}
    )
    if active_rentals_count >= 3:
        raise HTTPException(
            status_code=400,
            detail=f"Klient {client.get('firstName')} {client.get('lastName')} osiągnął limit 3 aktywnych wypożyczeń"
        )
    
    # Sprawdź czy klient już wypożyczył ten film
    existing = await run_blocking(
        db.Rentals.find_one,
        {"clientId": client_id, "movieId": movie_id, "status": "active"}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Klient już wypożyczył ten film")
    
    # Utwórz wypożyczenie
    now = datetime.utcnow()
    rental = {
        "clientId": client_id,
        "movieId": movie_id,
        "movieTitle": movie.get("title"),
        "rentalDate": now,
        "plannedReturnDate": now + timedelta(days=2),
        "actualReturnDate": None,
        "status": "active",
    }
    
    result = await run_blocking(db.Rentals.insert_one, rental)
    
    # Zaktualizuj licznik wypożyczeń klienta
    await run_blocking(
        db.Clients.update_one,
        {"_id": ObjectId(client_id)},
        {"$inc": {"activeRentalsCount": 1}}
    )
    
    # Ustaw film jako niedostępny
    await run_blocking(
        db.Movies.update_one,
        {"_id": movie_object_id},
        {"$set": {"is_available": False}}
    )
    
    return {
        "message": f"Film '{movie.get('title')}' został wypożyczony dla klienta {client.get('firstName')} {client.get('lastName')}",
        "rental_id": str(result.inserted_id),
        "client": f"{client.get('firstName')} {client.get('lastName')}",
        "movie": movie.get('title'),
        "rentalDate": now.isoformat(),
        "plannedReturnDate": (now + timedelta(days=2)).isoformat()
    }


@app.get("/rentals", dependencies=[Depends(require_admin)])
async def get_all_rentals_old():
    """Stary endpoint - zachowany dla kompatybilności"""
    db = get_db_connection()
    rentals = await run_blocking(list, db.Rentals.find())
    return rentals


@app.delete("/movies/{movie_id}")
async def delete_movie(
    movie_id: str,
    current_user: dict = Depends(require_admin)
):
    """Usuwa film, o ile nie ma aktywnych wypożyczeń (tylko admin)"""
    db = get_db_connection()

    try:
        object_id = ObjectId(movie_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid movie ID format"
        )

    # Sprawdzenie, czy film ma aktywne wypożyczenia
    active_rentals = await run_blocking(
        db.Rentals.count_documents,
        {"movieId": movie_id, "status": "active"}
    )
    
    if active_rentals > 0:
        # Obsługa błędu - film ma aktywne wypożyczenia
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete movie: it currently has active rentals."
        )

    # Usunięcie filmu
    # Używamy delete_one, bo _id jest unikalne
    result = await run_blocking(db.Movies.delete_one, {"_id": object_id})

    # Obsługa błędu - czy film w ogóle istniał
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Movie not found"
        )
    
    return {"message": "Movie deleted successfully"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)