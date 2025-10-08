# Movies Service

🎬 **Serwis katalogu filmów** dla aplikacji Wypożyczalnia Filmów

---

## 📋 Funkcjonalności (planowane)

- ✅ CRUD filmów (Create, Read, Update, Delete)
- ✅ Wyszukiwanie filmów (tytuł, gatunek, rok)
- ✅ Wypożyczanie filmów
- ✅ Zwracanie filmów
- ✅ Historia wypożyczeń użytkownika
- 🚧 Recenzje i oceny filmów
- 🚧 Rekomendacje filmów
- 🚧 Zarządzanie zapasami

---

## 🛠️ Stack technologiczny

- **Framework**: FastAPI
- **Baza danych**: MongoDB
- **Uwierzytelnianie**: JWT (walidacja z Auth Service)
- **Dokumentacja API**: Swagger/OpenAPI
- **Upload plików**: obsługa plakatów filmów

---

## 📁 Struktura (docelowa)

```
movies-service/
├── main.py              # Punkt wejścia aplikacji
├── requirements.txt     # Zależności Python
├── Dockerfile          # Konteneryzacja
├── README.md           # Ta dokumentacja
├── app/
│   ├── __init__.py
│   ├── config.py       # Konfiguracja (DB, Auth)
│   ├── models/
│   │   ├── movie.py    # Model filmu
│   │   └── rental.py   # Model wypożyczenia
│   ├── routes/
│   │   ├── movies.py   # CRUD filmów
│   │   └── rentals.py  # Wypożyczenia
│   ├── services/
│   │   ├── movie_service.py   # Logika filmów
│   │   └── rental_service.py  # Logika wypożyczeń
│   └── utils/
│       ├── auth.py         # Walidacja JWT
│       └── search.py       # Wyszukiwanie
└── tests/
    ├── test_movies.py  # Testy filmów
    └── test_rentals.py # Testy wypożyczeń
```

---

## 🔌 API Endpoints (planowane)

### Filmy
```http
GET    /movies              # Lista filmów (z paginacją)
GET    /movies/{movie_id}   # Szczegóły filmu
POST   /movies              # Dodaj film (admin)
PUT    /movies/{movie_id}   # Edytuj film (admin)
DELETE /movies/{movie_id}   # Usuń film (admin)
GET    /movies/search?q=    # Wyszukaj filmy
```

### Wypożyczenia
```http
GET    /rentals/my          # Moje wypożyczenia
POST   /rentals             # Wypożycz film
PUT    /rentals/{rental_id}/return  # Zwróć film
GET    /rentals/{rental_id} # Szczegóły wypożyczenia
```

### Kategorie i gatunki
```http
GET    /genres              # Lista gatunków
GET    /movies/genre/{genre} # Filmy danego gatunku
```

---

## 🎬 Model filmu (MongoDB)

```json
{
  "_id": "ObjectId",
  "title": "Inception",
  "description": "Dom Cobb jest złodziejem...",
  "genre": ["Sci-Fi", "Thriller"],
  "year": 2010,
  "director": "Christopher Nolan",
  "cast": ["Leonardo DiCaprio", "Marion Cotillard"],
  "duration_minutes": 148,
  "rating": "PG-13",
  "poster_url": "https://example.com/posters/inception.jpg",
  "available_copies": 5,
  "total_copies": 10,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

---

## 📝 Model wypożyczenia

```json
{
  "_id": "ObjectId",
  "user_id": "user_object_id",
  "movie_id": "movie_object_id",
  "rental_date": "2024-01-01T00:00:00Z",
  "due_date": "2024-01-08T00:00:00Z",
  "return_date": null,
  "status": "active",  // active, returned, overdue
  "rental_price": 4.99
}
```

---

## 🚀 Uruchomienie lokalne (gdy będzie gotowy)

```bash
# Przejdź do katalogu serwisu
cd services/movies-service

# Utwórz wirtualne środowisko
python -m venv venv
source venv/bin/activate    # Linux/Mac
# lub: venv\Scripts\activate  # Windows

# Zainstaluj zależności
pip install -r requirements.txt

# Ustaw zmienne środowiskowe
export MONGO_URL="mongodb://localhost:27017/movie_rental"
export AUTH_SERVICE_URL="http://localhost:8000"

# Uruchom serwer
uvicorn main:app --reload --port 8001
```

Serwis będzie dostępny na: **http://localhost:8001**  
Dokumentacja API: **http://localhost:8001/docs**

---

## 🐳 Docker

```bash
# Build obrazu
docker build -t movie-rental-movies .

# Uruchomienie kontenera
docker run -p 8001:8001 \
  -e MONGO_URL="mongodb://host.docker.internal:27017/movie_rental" \
  -e AUTH_SERVICE_URL="http://auth-service:8000" \
  movie-rental-movies
```

---

## 📚 Przykłady użycia (gdy API będzie gotowe)

### Lista filmów
```bash
curl -X GET "http://localhost:8001/movies?page=1&limit=10"
```

### Szczegóły filmu
```bash
curl -X GET "http://localhost:8001/movies/64a1b2c3d4e5f6789abcdef0"
```

### Wypożycz film (wymaga JWT token)
```bash
curl -X POST "http://localhost:8001/rentals" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "movie_id": "64a1b2c3d4e5f6789abcdef0"
  }'
```

### Wyszukaj filmy
```bash
curl -X GET "http://localhost:8001/movies/search?q=inception&genre=sci-fi"
```

---

## 🔒 Autoryzacja

Serwis komunikuje się z **Auth Service** w celu walidacji JWT tokenów:

```python
# Przykład walidacji tokenu
async def validate_token(token: str):
    response = requests.post(
        f"{AUTH_SERVICE_URL}/auth/validate",
        headers={"Authorization": f"Bearer {token}"}
    )
    return response.json()
```

---

## 🧪 Status implementacji

- [ ] **Podstawowa struktura projektu**
- [ ] **Model filmu (MongoDB)**
- [ ] **Model wypożyczenia**
- [ ] **CRUD filmów**
- [ ] **System wypożyczeń**
- [ ] **Wyszukiwanie filmów**
- [ ] **Integracja z Auth Service**
- [ ] **Testy jednostkowe**
- [ ] **Dockeryzacja**
- [ ] **Dokumentacja API**

---

## 👨‍💻 Dla deweloperów

### Wymagania
- Python 3.10+
- MongoDB (lokalnie lub Docker)
- Auth Service (dla walidacji tokenów)
- Znajomość FastAPI

### Zależności (requirements.txt)
```
fastapi==0.104.1
uvicorn==0.24.0
pymongo==4.6.0
requests==2.31.0
python-multipart==0.0.6
```

### Zmienne środowiskowe
```bash
MONGO_URL=mongodb://localhost:27017/movie_rental
AUTH_SERVICE_URL=http://localhost:8000
UPLOAD_FOLDER=./uploads/posters
MAX_FILE_SIZE=5242880  # 5MB
```

---

## 📊 Planowane funkcjonalności zaawansowane

### Wyszukiwanie
- Wyszukiwanie pełnotekstowe (MongoDB Text Index)
- Filtrowanie po gatunku, roku, reżyserze
- Sortowanie (tytuł, rok, ocena, popularność)

### Rekomendacje
- Filmy podobne do obejrzanych
- Popularne w tym miesiącu
- Rekomendacje oparte na gatunkach

### Analytics
- Statystyki wypożyczeń
- Najpopularniejsze filmy
- Raport przychodów (admin)

### Upload obrazów
- Plakaty filmów
- Validacja plików (format, rozmiar)
- Optymalizacja obrazów