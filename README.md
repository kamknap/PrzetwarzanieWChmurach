# 🎬 Przetwarzanie w Chmurach – Wypożyczalnia Filmów

Aplikacja webowa **„Wypożyczalnia Filmów"** wdrożona w chmurze **Microsoft Azure**.  
Projekt realizowany w ramach przedmiotu *Przetwarzanie w Chmurach*.

---

## 📁 Struktura projektu

```
PrzetwarzanieWChmurach/
├─ frontend/                     # ✅ React + Vite
│  ├─ src/                       # Kod źródłowy React
│  ├─ Dockerfile                 # Produkcyjny build
│  ├─ Dockerfile.dev             # Build deweloperski
│  └─ package.json
├─ services/
│  ├─ auth-service/             # ✅ FastAPI - uwierzytelnianie
│  │  ├─ app/
│  │  │  └─ main.py
│  │  ├─ tests/
│  │  ├─ Dockerfile
│  │  ├─ requirements.txt
│  │  └─ README.md
│  ├─ movies-service/           # ✅ FastAPI - katalog filmów
│  │  ├─ app/
│  │  │  └─ main.py
│  │  ├─ tests/
│  │  ├─ Dockerfile
│  │  ├─ requirements.txt
│  │  └─ README.md
│  └─ shared/                   # ✅ Współdzielone moduły
│     ├─ __init__.py
│     └─ database.py            # Połączenie z MongoDB
├─ e2e-tests/                   # ✅ Testy end-to-end
│  ├─ tests/
│  ├─ pages/
│  ├─ Dockerfile
│  └─ requirements.txt
├─ infra/                       # � Dokumentacja infrastruktury
│  └─ README.md
├─ .github/
│  └─ workflows/                # ⚠️ CI/CD (GitHub Actions - pusty)
├─ docs/                        # 📚 Dokumentacja projektu
├─ docker-compose.yml           # 🐳 Środowisko deweloperskie
├─ docker-compose-pull.yml      # 🐳 Deployment z Docker Hub
├─ .env                         # ⚙️ Zmienne środowiskowe (NIE commitować!)
├─ .env.example                 # ⚙️ Przykładowe zmienne
├─ Jenkinsfile                  # 🔧 Pipeline CI/CD (Jenkins)
├─ AZURE_DEPLOYMENT.md          # ☁️ Deployment do Azure (CLI)
├─ AZURE_PORTAL_DEPLOYMENT.md   # ☁️ Deployment do Azure (Portal)
├─ START_HERE.md                # 🚀 Szybki start
└─ README.md                    # 📖 Ten plik
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
| ☁️ **Chmura** | Microsoft **Azure** | ✅ **Gotowe** (Container Apps) |
| 💻 **Backend** | **Python** + **FastAPI** | ✅ **Gotowe** |
| 🧠 **Frontend** | **React** + **Vite** | ✅ **Gotowe** |
| 🗄️ **Baza danych** | **MongoDB Atlas** | ✅ **Gotowe** (Cloud) |
| 🧪 **Testy E2E** | **Playwright/Selenium** | ✅ **Gotowe** |
| 🔄 **CI/CD** | **Jenkins** | ✅ **Gotowe** (Jenkinsfile) |
| 🔁 **CI/CD** | **GitHub Actions** | 🚧 Planowane |
| 🧱 **IaC** | **Terraform** | 🚧 Planowane |
| 🐳 **Konteneryzacja** | **Docker** | ✅ **Gotowe** (Multi-stage builds) |

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
- [x] Auth Service (FastAPI + JWT)
- [x] Movies Service (FastAPI + MongoDB)
- [x] Połączenie frontend ↔ backend
- [x] **Pełna konteneryzacja (Docker)**
- [x] **MongoDB Atlas (cloud database)**
- [x] **Dokumentacja deployment do Azure**

### 🚧 W trakcie
- [ ] Deployment do Azure Container Apps (gotowa dokumentacja!)

### 📋 Planowane
- [ ] Testy jednostkowe i integracyjne
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Infrastruktura jako kod (Terraform)
- [ ] Monitoring i logi w Azure
- [ ] HTTPS i zabezpieczenia (auto w Azure)
- [ ] Custom domain

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
python -m uvicorn app.main:app --reload --port 8000
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

## 👥 Zespół projektowy

- 🧑‍💻 **Jan Wąs**
- 🧑‍💻 **Kamil Knapik**

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
