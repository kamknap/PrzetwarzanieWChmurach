# 🚀 SZYBKI START - Movies App

## ✅ Wymagania
- Docker Desktop uruchomiony
- Ten folder projektu

---

## 🎯 **3 KROKI do uruchomienia:**

### **1️⃣ Edytuj plik `docker-compose-pull.yml`**

Otwórz `docker-compose-pull.yml` i **ZAMIEŃ** w 3 miejscach:

```yaml
# ZNAJDŹ TO (3 razy):
image: <TWOJA_NAZWA_DOCKER_HUB>/auth-service:latest

# ZAMIEŃ NA (przykład):
image: jankowalski/auth-service:latest
```

Zmień w: `auth-service`, `movies-service`, `frontend`

---

### **2️⃣ Uruchom w terminalu:**

```powershell
# Przejdź do folderu projektu
cd C:\Users\knapi\Documents\GitHub\PrzetwarzanieWChmurach

# Uruchom wszystko (Docker pobierze obrazy automatycznie!)
docker-compose -f docker-compose-pull.yml up -d
```

Poczekaj ~2-5 minut (pierwsza instalacja)

---

### **3️⃣ Otwórz w przeglądarce:**

- **Aplikacja:** http://localhost
- **Auth API:** http://localhost:8000/docs
- **Movies API:** http://localhost:8001/docs

---

## 🛑 **Jak zatrzymać:**

```powershell
docker-compose -f docker-compose-pull.yml down
```

---

## ❓ **Problemy?**

### Port 80 zajęty?
```powershell
# Zobacz co zajmuje
netstat -ano | findstr :80

# Zabij proces
taskkill /PID <numer> /F
```

### Nie może pobrać obrazów?
Sprawdź czy nazwa Docker Hub w `docker-compose-pull.yml` jest poprawna.

### Więcej pomocy?
📖 Zobacz: `QUICK_START_COLLEAGUE.md`

---

## 🎉 **To wszystko!**

Aplikacja powinna działać na http://localhost
