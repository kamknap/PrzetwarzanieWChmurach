# 🎬 Przetwarzanie w Chmurach – Wypożyczalnia Filmów

Aplikacja webowa **„Wypożyczalnia Filmów"** wdrożona w chmurze **Microsoft Azure**.  
Projekt realizowany w ramach przedmiotu *Przetwarzanie w Chmurach*.

---

## 📁 Struktura projektu

```
movie-rental/
├─ frontend/                  # ✅ React + Vite (gotowy)
├─ services/
│  ├─ auth-service/          # 🚧 FastAPI - uwierzytelnianie (planowany)
│  └─ movies-service/        # 🚧 FastAPI - katalog filmów (planowany)
├─ infra/                    # 🚧 Infrastruktura jako kod (Terraform)
├─ .github/workflows/        # 🚧 CI/CD (GitHub Actions)
├─ docs/                     # 📚 Dokumentacja projektu
├─ docker-compose.yml        # 🐳 Środowisko deweloperskie
├─ .env.example              # ⚙️ Przykładowe zmienne środowiskowe
└─ README.md                 # 📖 Ten plik
```

---

## 🚀 Szybki start

### Wymagania
- **Node.js** 18+ (dla frontendu)
- **Python** 3.10+ (dla serwisów backend)
- **Docker** + **Docker Compose** (dla pełnego środowiska)

### 1. Klonowanie repo
```bash
git clone https://github.com/kamknap/PrzetwarzanieWChmurach.git
cd PrzetwarzanieWChmurach
```

### 2. Konfiguracja środowiska
```bash
# Skopiuj przykładową konfigurację
cp .env.example .env

# Edytuj zmienne środowiskowe (opcjonalnie)
# UWAGA: Nie commituj pliku .env!
```

### 3A. Uruchomienie tylko frontendu (dostępne teraz)
```bash
cd frontend
npm install
npm run dev
# Otwórz: http://localhost:5173
```

### 3B. Uruchomienie pełnego środowiska (gdy backend będzie gotowy)
```bash
# Uruchom wszystkie serwisy
docker-compose up -d

# Sprawdź statusy
docker-compose ps

# Logi serwisów
docker-compose logs -f
```

---

## ⚙️ Technologie i narzędzia

| Kategoria | Technologia | Status |
|------------|--------------|--------|
| ☁️ **Chmura** | Microsoft **Azure** | 🚧 Planowane |
| 💻 **Backend** | **Python** + **FastAPI** | 🚧 Planowane |
| 🧠 **Frontend** | **React** + **Vite** | ✅ **Gotowe** |
| 🗄️ **Baza danych** | **MongoDB** | 🚧 Planowane |
| 🔁 **CI/CD** | **GitHub Actions** | 🚧 Planowane |
| 🧱 **IaC** | **Terraform** | 🚧 Planowane |
| 🐳 **Konteneryzacja** | **Docker** | 🚧 W trakcie |

---

## 🏗️ Architektura (docelowa)

### Mikrousługi
- **Frontend** (port 5173): React SPA komunikujący się z API
- **Auth Service** (port 8000): Rejestracja, logowanie, JWT
- **Movies Service** (port 8001): CRUD filmów, wypożyczenia
- **MongoDB** (port 27017): Baza danych dla wszystkich serwisów

### Komunikacja
```
Frontend (React) 
    ↓ HTTP/REST
Auth Service (FastAPI) ←→ MongoDB
    ↓ JWT validation
Movies Service (FastAPI) ←→ MongoDB
```

### Endpointy (planowane)
- `POST /auth/register` - Rejestracja użytkownika
- `POST /auth/login` - Logowanie (zwraca JWT)
- `GET /movies` - Lista dostępnych filmów
- `POST /movies/{id}/rent` - Wypożycz film
- `POST /movies/{id}/return` - Zwróć film

---

## 🧩 Funkcjonalności (roadmap)

### ✅ Zrealizowane
- [x] Podstawowa struktura projektu
- [x] Frontend React + Vite
- [x] Docker Compose dla lokalnego developmentu
- [x] Konfiguracja środowiska (.env)

### 🚧 W trakcie
- [ ] Auth Service (FastAPI + JWT)
- [ ] Movies Service (FastAPI + MongoDB)
- [ ] Połączenie frontend ↔ backend

### 📋 Planowane
- [ ] Testy jednostkowe i integracyjne
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Wdrożenie na Azure (Container Instances)
- [ ] Infrastruktura jako kod (Terraform)
- [ ] Monitoring i logi
- [ ] HTTPS i zabezpieczenia

---

## 🔧 Rozwój projektu

### Dla deweloperów backend
```bash
# Praca nad auth-service
cd services/auth-service
python -m venv venv
source venv/bin/activate  # Linux/Mac
# lub: venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Dla deweloperów frontend
```bash
# Praca nad frontendem
cd frontend
npm install
npm run dev  # http://localhost:5173
npm run build  # Build produkcyjny
```

### Praca z Docker
```bash
# Rebuild kontenera po zmianach
docker-compose up --build auth-service

# Tylko baza danych (do testów)
docker-compose up mongodb

# Zatrzymanie wszystkich serwisów
docker-compose down
```

---

## 📚 Dokumentacja

- [`frontend/README.md`](frontend/README.md) - Szczegóły frontendu
- [`services/auth-service/README.md`](services/auth-service/README.md) - API uwierzytelniania
- [`services/movies-service/README.md`](services/movies-service/README.md) - API filmów
- [`docs/`](docs/) - Diagramy architektury i decyzje projektowe

---

## 👥 Zespół projektowy

- 🧑‍💻 **Jan Wąs** - Backend, DevOps
- 🧑‍💻 **Kamil Knapik** - Frontend, Architecture

---

## ❓ FAQ

**Q: Czy mogę uruchomić tylko frontend?**  
A: Tak! `cd frontend && npm run dev` - backend nie jest jeszcze wymagany.

**Q: Gdzie są prawdziwe sekrety?**  
A: W produkcji będą w Azure Key Vault. Lokalnie używaj `.env` (nie commituj!).

**Q: Jak dodać nowy serwis?**  
A: Utwórz folder w `services/`, dodaj do `docker-compose.yml`, zaktualizuj dokumentację.

---

## 📄 Licencja

Projekt akademicki – tylko do celów edukacyjnych.