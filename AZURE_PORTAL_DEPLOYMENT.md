# 🖱️ Deployment do Azure Container Apps - PORTAL (GUI)

> **Ten przewodnik pokazuje jak zdeployować aplikację przez interfejs graficzny Azure Portal**

---

## 📋 **Wymagania wstępne**

- ✅ Konto Azure (możesz użyć Free Trial - $200 kredytów)
- ✅ Zbudowane obrazy Docker lokalnie
- ✅ Dostęp do przeglądarki

---

## 🎯 **KROK 1: Tworzenie Resource Group**

### 1.1 Zaloguj się do Azure Portal
1. Otwórz: https://portal.azure.com
2. Zaloguj się swoim kontem Microsoft

### 1.2 Utwórz Resource Group
1. W menu po lewej stronie kliknij **"Resource groups"**
2. Kliknij **"+ Create"** (na górze)
3. Wypełnij formularz:
   ```
   Subscription: Twoja subskrypcja
   Resource group name: movies-app-rg
   Region: West Europe (lub Poland Central jeśli dostępne)
   ```
4. Kliknij **"Review + create"**
5. Kliknij **"Create"**

✅ **Gotowe!** Masz resource group.

---

## 🐳 **KROK 2: Container Registry (ACR)**

### 2.1 Otwórz Azure Container Registry
1. W górnym pasku wyszukaj: **"Container registries"**
2. Kliknij **"+ Create"**

### 2.2 Wypełnij formularz
**Basics:**
```
Subscription: Twoja subskrypcja
Resource group: movies-app-rg (wybierz z listy)
Registry name: moviesappregistry (musi być UNIKALNA globalnie!)
Location: West Europe
SKU: Basic (najtańszy - ~5 USD/miesiąc)
```

**Networking:**
```
Public network access: Enabled (dla uproszczenia)
```

**Encryption:**
```
Pozostaw domyślne
```

3. Kliknij **"Review + create"**
4. Kliknij **"Create"**
5. Poczekaj ~30 sekund

### 2.3 Włącz Admin User
1. Po utworzeniu, kliknij **"Go to resource"**
2. W menu po lewej: **Settings → Access keys**
3. Przełącz **"Admin user"** na **"Enabled"**
4. **ZAPISZ**:
   - Login: `moviesappregistry`
   - Password: (kliknij "copy" obok password)
   - Login server: `moviesappregistry.azurecr.io`

✅ **Gotowe!** Teraz możesz pushować obrazy.

---

## 📦 **KROK 3: Push obrazów Docker do ACR**

### 3.1 Zaloguj się do ACR (PowerShell)
```powershell
# Użyj hasła skopiowanego w kroku 2.3
docker login moviesappregistry.azurecr.io
Username: moviesappregistry
Password: [WKLEJ_HASŁO]
```

### 3.2 Taguj i push obrazy
```powershell
# Przejdź do katalogu projektu
cd C:\Users\knapi\Documents\GitHub\PrzetwarzanieWChmurach

# Auth Service
docker tag przetwarzaniewchmurach-auth-service moviesappregistry.azurecr.io/auth-service:latest
docker push moviesappregistry.azurecr.io/auth-service:latest

# Movies Service
docker tag przetwarzaniewchmurach-movies-service moviesappregistry.azurecr.io/movies-service:latest
docker push moviesappregistry.azurecr.io/movies-service:latest

# Frontend (na razie z localhost - zaktualizujemy później!)
docker tag przetwarzaniewchmurach-frontend moviesappregistry.azurecr.io/frontend:latest
docker push moviesappregistry.azurecr.io/frontend:latest
```

### 3.3 Weryfikacja w portalu
1. Wróć do Azure Portal → Container Registry
2. W menu po lewej: **Services → Repositories**
3. Powinieneś zobaczyć 3 repozytoria:
   - `auth-service`
   - `movies-service`
   - `frontend`

✅ **Gotowe!** Obrazy są w chmurze.

---

## ☁️ **KROK 4: Container Apps Environment**

### 4.1 Utwórz Container Apps Environment
1. W Azure Portal wyszukaj: **"Container Apps"**
2. Kliknij **"+ Create"**
3. Wypełnij **Basics**:
   ```
   Subscription: Twoja subskrypcja
   Resource group: movies-app-rg
   Container app name: auth-service (UWAGA: to jeszcze NIE nazwa środowiska!)
   Region: West Europe
   ```

4. W sekcji **Container Apps Environment** kliknij **"Create new"**:
   ```
   Environment name: movies-app-env
   Environment type: Consumption (pay-as-you-go)
   Zone redundancy: Disabled (dla oszczędności)
   ```
5. Kliknij **"Create"** (dla environment)

✅ Environment zostanie utworzone automatycznie!

---

## 🚢 **KROK 5: Deploy Auth Service**

### 5.1 Kontynuuj tworzenie Container App
Po utworzeniu environment, kontynuuj formularz:

**Container:**
1. Odznacz **"Use quickstart image"**
2. Wypełnij:
   ```
   Name: auth-service
   Image source: Azure Container Registry
   Registry: moviesappregistry.azurecr.io
   Image: auth-service
   Image tag: latest
   ```
3. W sekcji **Authentication** wybierz:
   ```
   Registry: moviesappregistry.azurecr.io
   Username: moviesappregistry
   Password: [WKLEJ_HASŁO_Z_KROKU_2.3]
   ```

**Application ingress:**
1. **Enabled:** ✅ (zaznacz!)
2. **Ingress traffic:** Accepting traffic from anywhere
3. **Ingress type:** HTTP
4. **Target port:** `8000`

**Resources:**
```
CPU cores: 0.5
Memory: 1 Gi
Min replicas: 1
Max replicas: 3
```

### 5.2 Dodaj zmienne środowiskowe
1. Przewiń w dół do sekcji **Container** → **Environment variables**
2. Kliknij **"+ Add"** dla każdej zmiennej:

| Name | Value | Type |
|------|-------|------|
| `MONGO_URI` | `mongodb+srv://jwas030716_db_user:PqWHxU4lDtXK8uUT@video.pnthizn.mongodb.net/` | Manual |
| `MONGO_DATABASE` | `Video` | Manual |
| `JWT_SECRET` | `your-secret-key-here` | Manual |
| `JWT_ALGORITHM` | `HS256` | Manual |
| `JWT_EXPIRE_MINUTES` | `30` | Manual |

### 5.3 Utwórz aplikację
1. Kliknij **"Review + create"**
2. Kliknij **"Create"**
3. Poczekaj ~2-3 minuty na deployment

### 5.4 Sprawdź URL
1. Po utworzeniu, kliknij **"Go to resource"**
2. W sekcji **Essentials** znajdź **"Application URL"**
3. **ZAPISZ TEN URL!** Będzie wyglądał jak:
   ```
   https://auth-service.{random-suffix}.westeurope.azurecontainerapps.io
   ```
4. Przetestuj: dodaj `/docs` do URL i otwórz w przeglądarce
   ```
   https://auth-service.{TWOJ_URL}.azurecontainerapps.io/docs
   ```

✅ **Auth Service działa w chmurze!**

---

## 🎬 **KROK 6: Deploy Movies Service**

### 6.1 Utwórz nowy Container App
1. Wróć do **Container Apps** (wyszukaj w górnym pasku)
2. Kliknij **"+ Create"**

### 6.2 Wypełnij formularz
**Basics:**
```
Subscription: Twoja subskrypcja
Resource group: movies-app-rg
Container app name: movies-service
Region: West Europe
Container Apps Environment: movies-app-env (wybierz istniejące!)
```

**Container:**
```
Name: movies-service
Image source: Azure Container Registry
Registry: moviesappregistry.azurecr.io
Image: movies-service
Image tag: latest
Username: moviesappregistry
Password: [HASŁO_ACR]
```

**Application ingress:**
```
Enabled: ✅
Ingress traffic: Accepting traffic from anywhere
Ingress type: HTTP
Target port: 8001
```

**Resources:**
```
CPU cores: 0.5
Memory: 1 Gi
Min replicas: 1
Max replicas: 3
```

### 6.3 Zmienne środowiskowe
**WAŻNE**: Użyj **WEWNĘTRZNEGO** URL dla `AUTH_SERVICE_URL`!

| Name | Value | Type |
|------|-------|------|
| `MONGO_URI` | `mongodb+srv://jwas030716_db_user:PqWHxU4lDtXK8uUT@video.pnthizn.mongodb.net/` | Manual |
| `MONGO_DATABASE` | `Video` | Manual |
| `AUTH_SERVICE_URL` | `https://auth-service.internal.{TWOJ_ENV_SUFFIX}.westeurope.azurecontainerapps.io` | Manual |

> **TIP**: Możesz też użyć zewnętrznego URL auth-service (ten ze kroku 5.4)

### 6.4 Utwórz i sprawdź
1. **Review + create** → **Create**
2. Po utworzeniu, **zapisz URL** movies-service:
   ```
   https://movies-service.{random-suffix}.westeurope.azurecontainerapps.io
   ```
3. Przetestuj: `{URL}/docs`

✅ **Movies Service działa!**

---

## 🎨 **KROK 7: Przebuduj i Deploy Frontend**

### 7.1 Przebuduj frontend z prawdziwymi URLs
Teraz masz URLe backendu! Przebuduj frontend lokalnie:

```powershell
cd C:\Users\knapi\Documents\GitHub\PrzetwarzanieWChmurach

# PODMIEŃ {TWOJE_URLE} na prawdziwe!
docker build -t moviesappregistry.azurecr.io/frontend:v2 `
  --build-arg VITE_AUTH_API=https://auth-service.{TWOJ_SUFFIX}.westeurope.azurecontainerapps.io `
  --build-arg VITE_MOVIES_API_URL=https://movies-service.{TWOJ_SUFFIX}.westeurope.azurecontainerapps.io `
  ./frontend

# Push do ACR
docker push moviesappregistry.azurecr.io/frontend:v2
```

### 7.2 Utwórz Container App dla frontendu
1. **Container Apps** → **+ Create**

**Basics:**
```
Container app name: frontend
Resource group: movies-app-rg
Container Apps Environment: movies-app-env
```

**Container:**
```
Name: frontend
Image source: Azure Container Registry
Registry: moviesappregistry.azurecr.io
Image: frontend
Image tag: v2 (UWAGA: wersja 2!)
```

**Application ingress:**
```
Enabled: ✅
Ingress traffic: Accepting traffic from anywhere
Ingress type: HTTP
Target port: 80
```

**Resources:**
```
CPU cores: 0.25
Memory: 0.5 Gi
Min replicas: 1
Max replicas: 5
```

### 7.3 Brak zmiennych środowiskowych!
Frontend nie potrzebuje ENV variables w runtime (wszystko jest w build time).

### 7.4 Utwórz i sprawdź
1. **Review + create** → **Create**
2. **ZAPISZ URL frontendu**:
   ```
   https://frontend.{random-suffix}.westeurope.azurecontainerapps.io
   ```
3. Otwórz w przeglądarce!

✅ **Cała aplikacja działa w Azure!** 🎉

---

## 🔍 **KROK 8: Testowanie i weryfikacja**

### 8.1 Test frontendu
1. Otwórz URL frontendu w przeglądarce
2. Spróbuj się zalogować
3. Sprawdź czy widzisz filmy

### 8.2 Sprawdź logi (jeśli coś nie działa)
1. Przejdź do **Container Apps** → wybierz aplikację (np. `auth-service`)
2. W menu po lewej: **Monitoring → Log stream**
3. Zobacz logi w czasie rzeczywistym
4. Lub: **Monitoring → Logs** (bardziej zaawansowane zapytania)

### 8.3 Sprawdź metryki
1. **Monitoring → Metrics**
2. Możesz zobaczyć:
   - CPU usage
   - Memory usage
   - Request count
   - Response time

---

## 🎛️ **KROK 9: Zarządzanie aplikacją**

### 9.1 Skalowanie
1. Przejdź do Container App → **Application → Scale**
2. Zmień **Min/Max replicas**
3. Dodaj **Scale rules** (np. skaluj przy 80% CPU)

### 9.2 Aktualizacja obrazu
1. Zbuduj nowy obraz lokalnie (z nowym tagiem, np. `v3`)
2. Push do ACR: `docker push moviesappregistry.azurecr.io/auth-service:v3`
3. W Azure Portal:
   - Przejdź do Container App
   - **Application → Containers**
   - Kliknij nazwę kontenera
   - **Edit** → zmień **Image tag** na `v3`
   - **Save**
4. Aplikacja automatycznie się zrestartuje z nowym obrazem!

### 9.3 Restart aplikacji
1. Przejdź do Container App
2. **Overview** → kliknij **"Restart"** na górze

### 9.4 Custom Domain (opcjonalne)
1. **Settings → Custom domains**
2. Kliknij **"+ Add custom domain"**
3. Wprowadź swoją domenę (np. `movies.mojadomena.pl`)
4. Dodaj rekord DNS (Portal pokaże instrukcje)
5. Azure automatycznie wygeneruje certyfikat SSL!

---

## 💰 **KROK 10: Monitorowanie kosztów**

### 10.1 Cost Management
1. W Azure Portal wyszukaj: **"Cost Management + Billing"**
2. **Cost Management → Cost analysis**
3. Ustaw filtr: `Resource group = movies-app-rg`
4. Zobacz breakdown kosztów

### 10.2 Ustaw budżet (alert)
1. **Cost Management → Budgets**
2. **+ Add**
3. Ustaw limit (np. $30/miesiąc)
4. Dodaj email alert gdy osiągniesz 80% limitu

---

## 🧹 **Usuwanie aplikacji (gdy skończysz testować)**

### Opcja 1: Usuń tylko Container Apps (zachowaj obrazy)
1. **Container Apps** → zaznacz wszystkie 3 aplikacje
2. Kliknij **"Delete"** na górze

### Opcja 2: Usuń całą Resource Group (wszystko!)
1. **Resource groups** → `movies-app-rg`
2. Kliknij **"Delete resource group"**
3. Wpisz nazwę: `movies-app-rg` (potwierdzenie)
4. **Delete**

> ⚠️ To usunie **WSZYSTKO**: Container Apps, Container Registry, obrazy, logi!

---

## 📊 **Porównanie: Portal vs CLI**

| Zadanie | Czas w Portalu | Czas w CLI |
|---------|---------------|-----------|
| **Pierwszy deployment** | ~30 minut | ~15 minut |
| **Aktualizacja obrazu** | ~2 minuty (klikanie) | ~10 sekund (komenda) |
| **Deploy nowego środowiska** | ~30 minut | ~30 sekund (ten sam skrypt) |
| **Debugging** | ⭐ Bardzo wygodne (GUI) | Trzeba znać komendy |

---

## 🎓 **Kiedy używać Portal?**

✅ **Pierwszy raz** - żeby zobaczyć opcje  
✅ **Debugging** - logi, metryki, monitoring  
✅ **Eksploracja** - sprawdzanie nowych feature'ów Azure  
✅ **Nauka** - rozumienie jak Azure działa  

## 🚀 **Kiedy używać CLI?**

✅ **Produkcja** - powtarzalne deploymenty  
✅ **CI/CD** - automatyzacja (GitHub Actions)  
✅ **Dokumentacja** - łatwo dzielić się komendami  
✅ **Szybkość** - deploy w sekundach  

---

## 💡 **Moja rekomendacja dla Ciebie:**

1. **Pierwszy raz**: Użyj **PORTAL** (ten przewodnik)
   - Zobaczysz wszystko wizualnie
   - Zrozumiesz strukturę Azure
   - Mniejsza szansa na błędy

2. **Drugi deployment**: Użyj **CLI** (`AZURE_DEPLOYMENT.md`)
   - Będziesz już wiedział co robisz
   - Zobacz jak szybciej można to zrobić
   - Zapisz skrypt dla przyszłości

3. **Zarządzanie**: Używaj **OBYDWU**
   - CLI dla aktualizacji
   - Portal dla debugowania i monitorowania

---

## 🎁 **BONUS: Szybki start z Free Trial**

1. Przejdź do: https://azure.microsoft.com/free/
2. **$200 kredytów** na 30 dni!
3. **12 miesięcy** darmowych usług (w tym Container Apps w ograniczonym zakresie)
4. Bez automatycznego obciążenia karty po zakończeniu trial

---

## ❓ **FAQ**

**Q: Czy Portal jest wolniejszy niż CLI?**  
A: Tak, ale dla pierwszego razu to nie problem. Uczysz się Azure!

**Q: Czy mogę łączyć Portal + CLI?**  
A: Oczywiście! Np. stwórz zasoby w Portal, aktualizuj przez CLI.

**Q: Czy mogę eksportować konfigurację z Portalu?**  
A: Tak! W każdym zasobie jest zakładka **"Export template"** → możesz pobrać JSON/ARM template.

**Q: Co jeśli zrobię błąd w Portalu?**  
A: Możesz usunąć zasób i zrobić ponownie. Lub edytować w ustawieniach.

---

## 🎉 **Gotowe!**

Teraz masz **DWA** kompletne przewodniki:
1. **AZURE_PORTAL_DEPLOYMENT.md** (ten plik) - GUI
2. **AZURE_DEPLOYMENT.md** - CLI

**Wybierz ten, który bardziej Ci odpowiada!** 🚀
