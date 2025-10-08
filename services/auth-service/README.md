# Auth Service

🔐 **Serwis uwierzytelniania** dla aplikacji Wypożyczalnia Filmów

---

## 📋 Funkcjonalności (planowane)

- ✅ Rejestracja użytkowników
- ✅ Logowanie (JWT tokens)
- ✅ Walidacja tokenów JWT
- ✅ Zarządzanie sesjami
- 🚧 Resetowanie haseł
- 🚧 Role i uprawnienia (admin/user)

---

## 🛠️ Stack technologiczny

- **Framework**: FastAPI
- **Baza danych**: MongoDB
- **Uwierzytelnianie**: JWT (JSON Web Tokens)
- **Hashowanie haseł**: bcrypt
- **Dokumentacja API**: Swagger/OpenAPI

---

## 📁 Struktura (docelowa)

```
auth-service/
├── main.py              # Punkt wejścia aplikacji
├── requirements.txt     # Zależności Python
├── Dockerfile          # Konteneryzacja
├── README.md           # Ta dokumentacja
├── app/
│   ├── __init__.py
│   ├── config.py       # Konfiguracja (DB, JWT)
│   ├── models/
│   │   └── user.py     # Model użytkownika
│   ├── routes/
│   │   ├── auth.py     # Endpointy logowania
│   │   └── users.py    # Zarządzanie użytkownikami
│   ├── services/
│   │   ├── auth_service.py    # Logika uwierzytelniania
│   │   └── user_service.py    # Operacje na użytkownikach
│   └── utils/
│       ├── jwt_handler.py     # Obsługa JWT
│       └── password.py        # Hashowanie haseł
└── tests/
    ├── test_auth.py    # Testy uwierzytelniania
    └── test_users.py   # Testy użytkowników
```

---

## 🔌 API Endpoints (planowane)

### Uwierzytelnianie
```http
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/refresh
```

### Użytkownicy
```http
GET  /users/me
PUT  /users/me
GET  /users/{user_id}    # tylko admin
```

### Walidacja
```http
POST /auth/validate      # do użytku przez inne serwisy
```

---

## 🚀 Uruchomienie lokalne (gdy będzie gotowy)

```bash
# Przejdź do katalogu serwisu
cd services/auth-service

# Utwórz wirtualne środowisko
python -m venv venv
source venv/bin/activate    # Linux/Mac
# lub: venv\Scripts\activate  # Windows

# Zainstaluj zależności
pip install -r requirements.txt

# Ustaw zmienne środowiskowe
export MONGO_URL="mongodb://localhost:27017/movie_rental"
export JWT_SECRET="your-secret-key"

# Uruchom serwer
uvicorn main:app --reload --port 8000
```

Serwis będzie dostępny na: **http://localhost:8000**  
Dokumentacja API: **http://localhost:8000/docs**

---

## 🐳 Docker

```bash
# Build obrazu
docker build -t movie-rental-auth .

# Uruchomienie kontenera
docker run -p 8000:8000 \
  -e MONGO_URL="mongodb://host.docker.internal:27017/movie_rental" \
  -e JWT_SECRET="your-secret-key" \
  movie-rental-auth
```

---

## 📚 Przykłady użycia (gdy API będzie gotowe)

### Rejestracja
```bash
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword",
    "full_name": "Jan Kowalski"
  }'
```

### Logowanie
```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword"
  }'
```

---

## 🔒 Bezpieczeństwo

- Hasła hashowane za pomocą **bcrypt**
- JWT tokeny z krótkim czasem wygaśnięcia (30 min)
- Refresh tokeny dla przedłużania sesji
- Walidacja danych wejściowych
- Rate limiting (planowane)
- CORS skonfigurowany dla frontendu

---

## 🧪 Status implementacji

- [ ] **Podstawowa struktura projektu**
- [ ] **Model użytkownika (MongoDB)**
- [ ] **Rejestracja użytkowników**
- [ ] **Logowanie + JWT**
- [ ] **Walidacja tokenów**
- [ ] **Refresh tokeny**
- [ ] **Testy jednostkowe**
- [ ] **Dockeryzacja**
- [ ] **Dokumentacja API**

---

## 👨‍💻 Dla deweloperów

### Wymagania
- Python 3.10+
- MongoDB (lokalnie lub Docker)
- Znajomość FastAPI i JWT

### Zależności (requirements.txt)
```
fastapi==0.104.1
uvicorn==0.24.0
pymongo==4.6.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
```

### Zmienne środowiskowe
```bash
MONGO_URL=mongodb://localhost:27017/movie_rental
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=30
```