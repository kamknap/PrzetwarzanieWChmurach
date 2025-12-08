# Movies Service

Serwis do zarządzania filmami w systemie wypożyczalni wideo. Komunikuje się z bazą danych MongoDB Atlas oraz serwisem autoryzacji (auth-service).

## Struktura bazy danych

Serwis korzysta z kolekcji `Movies` w bazie `Video` z następującą strukturą dokumentów:

```json
{
  "_id": "ObjectId",
  "title": "string",
  "year": "number",
  "genres": ["string"],
  "language": "string",
  "country": "string",
  "duration": "number",
  "description": "string",
  "director": "string",
  "rating": "number",
  "actors": ["string"],
  "addedDate": "Date",
  "is_available": "boolean"
}
```

## Wymagania

- Python 3.8+
- Dostęp do MongoDB Atlas
- Uruchomiony auth-service (localhost:8000)

## Instalacja i uruchomienie

### 1. Przejdź do katalogu serwisu

```bash
cd services/movies-service
```

### 2. Utwórz wirtualne środowisko (opcjonalne, ale zalecane)

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 3. Zainstaluj zależności

```bash
pip install -r requirements.txt
```

### 4. Konfiguracja środowiska

Upewnij się, że plik `.env` w głównym katalogu projektu zawiera:

```env
# MongoDB Atlas Connection
MONGO_URL=mongodb+srv://jwas030716_db_user:PqWHxU4lDtXK8uUT@video.pnthizn.mongodb.net/Video?retryWrites=true&w=majority

# Auth Service URL
AUTH_SERVICE_URL=http://localhost:8000

# Database Configuration
DATABASE_NAME=Video
MOVIES_COLLECTION=Movies

# Development settings
ENVIRONMENT=development
DEBUG=true
```

### 5. Uruchom serwer

```bash
# Z katalogu movies-service
cd app
python main.py
```

Lub za pomocą uvicorn:

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

Serwer będzie dostępny pod adresem: `http://localhost:8001`



