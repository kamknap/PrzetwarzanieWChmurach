# 📚 Przewodnik - Który plik docker-compose użyć?

## 🎯 **Szybka odpowiedź:**

| Jesteś... | Użyj pliku | Komenda |
|-----------|-----------|---------|
| **Developer** (masz kod źródłowy) | `docker-compose.yml` | `docker-compose up -d` |
| **Tester** (masz tylko Docker) | `docker-compose-pull.yml` | `docker-compose -f docker-compose-pull.yml up -d` |

---

## 📋 **Szczegółowe porównanie**

### **1. `docker-compose.yml` - DLA DEVELOPERÓW**

```yaml
services:
  auth-service:
    build:
      context: .
      dockerfile: services/auth-service/Dockerfile
    # ...
```

#### **Co robi:**
- **BUDUJE** obrazy Docker z kodu źródłowego (Dockerfile)
- Kompiluje aplikację React (frontend)
- Instaluje zależności Python (backend)

#### **Kiedy używać:**
- ✅ Masz pełen kod projektu
- ✅ Wprowadzasz zmiany w kodzie
- ✅ Rozwijasz nowe funkcje
- ✅ Debugujesz problemy

#### **Czas budowania:**
- Pierwszy raz: ~5-10 minut (pobiera dependencies)
- Kolejne buildy: ~1-3 minuty (cache)

#### **Uruchomienie:**
```powershell
# Build i run
docker-compose up -d --build

# Lub oddzielnie:
docker-compose build
docker-compose up -d
```

---

### **2. `docker-compose-pull.yml` - DLA TESTERÓW**

```yaml
services:
  auth-service:
    image: <TWOJA_NAZWA>/auth-service:latest
    # ...
```

#### **Co robi:**
- **POBIERA** gotowe obrazy z Docker Hub
- Nie buduje nic - tylko uruchamia
- Szybki start

#### **Kiedy używać:**
- ✅ Chcesz tylko uruchomić aplikację
- ✅ Testujesz gotową wersję
- ✅ Nie masz zainstalowanego Node.js/Python
- ✅ Nie zmieniasz kodu

#### **Wymagania:**
- Obrazy muszą być dostępne na Docker Hub
- Musisz znać nazwę właściciela Docker Hub

#### **Czas uruchomienia:**
- Pierwszy raz: ~2-5 minut (pobiera obrazy)
- Kolejne: ~10 sekund (obrazy są lokalnie)

#### **Uruchomienie:**
```powershell
# 1. Edytuj docker-compose-pull.yml - zamień <TWOJA_NAZWA>
# 2. Uruchom:
docker-compose -f docker-compose-pull.yml up -d
```

---

## 🔄 **Workflow dla różnych ról**

### **Developer (właściciel projektu):**

```powershell
# 1. Zmiana kodu
code frontend/src/App.jsx

# 2. Rebuild kontenera
docker-compose up -d --build frontend

# 3. Test
start http://localhost

# 4. Gdy gotowe - push do Docker Hub
docker tag przetwarzaniewchmurach-frontend jankowalski/frontend:latest
docker push jankowalski/frontend:latest
```

---

### **Tester (kolega):**

```powershell
# 1. Pobierz projekt (Git/OneDrive)
git pull

# 2. Uruchom gotowe obrazy
docker-compose -f docker-compose-pull.yml up -d

# 3. Test
start http://localhost

# 4. Zatrzymaj
docker-compose -f docker-compose-pull.yml down
```

---

## 📦 **Co jest w każdym pliku?**

### **`docker-compose.yml`**
```yaml
services:
  auth-service:
    build:                              # ← BUDUJE z Dockerfile
      context: .
      dockerfile: services/auth-service/Dockerfile
    ports:
      - "8000:8000"
    environment:
      - MONGO_URI=...
```

### **`docker-compose-pull.yml`**
```yaml
services:
  auth-service:
    image: jankowalski/auth-service:latest  # ← POBIERA gotowy obraz
    ports:
      - "8000:8000"
    environment:
      - MONGO_URI=...
```

**Różnica:** `build` vs `image`

---

## 🎓 **Przykłady użycia**

### **Scenariusz 1: Lokalny development**

```powershell
# Developer zmienia kod backendu
code services/auth-service/app/main.py

# Przebuduj i uruchom
docker-compose up -d --build auth-service

# Zobacz logi
docker-compose logs -f auth-service
```

### **Scenariusz 2: Szybki test**

```powershell
# Tester chce przetestować aplikację
docker-compose -f docker-compose-pull.yml up -d

# Test w przeglądarce
start http://localhost

# Gotowe
docker-compose -f docker-compose-pull.yml down
```

### **Scenariusz 3: Demo dla klienta**

```powershell
# Na laptopie bez kodu źródłowego
docker-compose -f docker-compose-pull.yml up -d

# Prezentacja
# ...

# Cleanup
docker-compose -f docker-compose-pull.yml down -v
```

---

## 🚀 **Wydajność**

| Operacja | docker-compose.yml | docker-compose-pull.yml |
|----------|-------------------|------------------------|
| **Pierwsze uruchomienie** | ~10 min (build) | ~3 min (pull) |
| **Kolejne uruchomienia** | ~10 sec | ~10 sec |
| **Po zmianie kodu** | ~1-3 min (rebuild) | N/A (nie można zmienić) |
| **Aktualizacja obrazów** | `up --build` | `pull` + `up` |

---

## 🔧 **Zaawansowane użycie**

### **Hybryda: Build local + Pull remote**

Możesz mieszać! Np. buduj backend lokalnie, ale używaj gotowego frontendu:

```yaml
services:
  auth-service:
    build:                              # ← Build lokalnie
      context: .
      dockerfile: services/auth-service/Dockerfile
  
  frontend:
    image: jankowalski/frontend:latest  # ← Pobierz gotowy
```

### **Override dla developmentu**

```powershell
# docker-compose.override.yml (auto-loaded)
services:
  auth-service:
    volumes:
      - ./services/auth-service/app:/app/app  # Hot reload!
```

---

## 📝 **Podsumowanie**

| | docker-compose.yml | docker-compose-pull.yml |
|---|-------------------|------------------------|
| **Dla kogo** | Developerzy | Testerzy, demo |
| **Co robi** | Buduje z kodu | Pobiera gotowe obrazy |
| **Wymagania** | Kod źródłowy | Tylko Docker |
| **Szybkość** | Wolniejsze (build) | Szybsze (pull) |
| **Zmiany kodu** | ✅ Tak | ❌ Nie |
| **Komenda** | `docker-compose up -d` | `docker-compose -f docker-compose-pull.yml up -d` |

---

## 📖 **Dodatkowe przewodniki**

- **QUICK_START_COLLEAGUE.md** - Instrukcje dla testera
- **AZURE_DEPLOYMENT.md** - Deployment do Azure (CLI)
- **AZURE_PORTAL_DEPLOYMENT.md** - Deployment do Azure (GUI)
- **README.md** - Główna dokumentacja

---

## ❓ **FAQ**

**Q: Mogę użyć obu plików jednocześnie?**  
A: Nie, wybierz jeden. Ale możesz mieć oba w projekcie.

**Q: Jak zmienić z build na pull?**  
A: Użyj `-f docker-compose-pull.yml` w komendzie.

**Q: Czy pull jest wolniejszy?**  
A: Pierwszy raz trwa dłużej (pobiera obrazy), ale kolejne uruchomienia są szybkie.

**Q: Co jeśli zmienię kod w projekcie z docker-compose-pull.yml?**  
A: Zmiany NIE będą widoczne - używasz gotowych obrazów. Musisz przejść na `docker-compose.yml`.

---

**Wybierz plik odpowiedni do Twojej roli i do dzieła!** 🚀
