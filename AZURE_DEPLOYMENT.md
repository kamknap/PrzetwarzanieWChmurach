# 🚀 Deployment do Azure Container Apps

## 📋 Przygotowanie

### 1. Zainstaluj Azure CLI
```powershell
# Instalacja
winget install -e --id Microsoft.AzureCLI

# Logowanie
az login
```

### 2. Ustaw subskrypcję
```powershell
az account list --output table
az account set --subscription "TWOJA_SUBSKRYPCJA_ID"
```

---

## 🏗️ Krok 1: Przygotowanie środowiska Azure

### Utwórz Resource Group
```powershell
az group create `
  --name movies-app-rg `
  --location westeurope
```

### Utwórz Container Registry (do przechowywania obrazów Docker)
```powershell
az acr create `
  --resource-group movies-app-rg `
  --name moviesappregistry `
  --sku Basic `
  --admin-enabled true
```

### Pobierz dane logowania do ACR
```powershell
az acr credential show --name moviesappregistry --resource-group movies-app-rg
```

---

## 🐳 Krok 2: Zbuduj i wyślij obrazy Docker

### Zaloguj się do ACR
```powershell
az acr login --name moviesappregistry
```

### Zbuduj obrazy lokalnie
```powershell
# Auth Service
docker build -t moviesappregistry.azurecr.io/auth-service:latest `
  -f services/auth-service/Dockerfile .

# Movies Service
docker build -t moviesappregistry.azurecr.io/movies-service:latest `
  -f services/movies-service/Dockerfile .

# Frontend (z domyślnymi localhost URLs - zaktualizujemy później!)
docker build -t moviesappregistry.azurecr.io/frontend:latest `
  --build-arg VITE_AUTH_API=http://localhost:8000 `
  --build-arg VITE_MOVIES_API_URL=http://localhost:8001 `
  ./frontend
```

### Wyślij obrazy do ACR
```powershell
docker push moviesappregistry.azurecr.io/auth-service:latest
docker push moviesappregistry.azurecr.io/movies-service:latest
docker push moviesappregistry.azurecr.io/frontend:latest
```

---

## ☁️ Krok 3: Utwórz Container Apps Environment

```powershell
# Zainstaluj rozszerzenie (jeśli jeszcze nie masz)
az extension add --name containerapp --upgrade

# Zarejestruj providera
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights

# Utwórz środowisko
az containerapp env create `
  --name movies-app-env `
  --resource-group movies-app-rg `
  --location westeurope
```

---

## 🚢 Krok 4: Deploy aplikacji

### 4.1 Deploy Auth Service
```powershell
az containerapp create `
  --name auth-service `
  --resource-group movies-app-rg `
  --environment movies-app-env `
  --image moviesappregistry.azurecr.io/auth-service:latest `
  --registry-server moviesappregistry.azurecr.io `
  --registry-username moviesappregistry `
  --registry-password "TWOJE_HASLO_Z_ACR" `
  --target-port 8000 `
  --ingress external `
  --min-replicas 1 `
  --max-replicas 3 `
  --cpu 0.5 `
  --memory 1.0Gi `
  --env-vars `
    MONGO_URI="mongodb+srv://jwas030716_db_user:PqWHxU4lDtXK8uUT@video.pnthizn.mongodb.net/" `
    MONGO_DATABASE="Video" `
    JWT_SECRET="your-secret-key-here" `
    JWT_ALGORITHM="HS256" `
    JWT_EXPIRE_MINUTES="30"
```

**Zapisz URL auth-service!** Będzie wyglądał jak:
`https://auth-service.{random-suffix}.{region}.azurecontainerapps.io`

### 4.2 Deploy Movies Service
```powershell
# UWAGA: Podmień {auth-service-url} na prawdziwy URL z poprzedniego kroku!
az containerapp create `
  --name movies-service `
  --resource-group movies-app-rg `
  --environment movies-app-env `
  --image moviesappregistry.azurecr.io/movies-service:latest `
  --registry-server moviesappregistry.azurecr.io `
  --registry-username moviesappregistry `
  --registry-password "TWOJE_HASLO_Z_ACR" `
  --target-port 8001 `
  --ingress external `
  --min-replicas 1 `
  --max-replicas 3 `
  --cpu 0.5 `
  --memory 1.0Gi `
  --env-vars `
    MONGO_URI="mongodb+srv://jwas030716_db_user:PqWHxU4lDtXK8uUT@video.pnthizn.mongodb.net/" `
    MONGO_DATABASE="Video" `
    AUTH_SERVICE_URL="https://auth-service.{TWOJ_SUFFIX}.westeurope.azurecontainerapps.io"
```

**Zapisz URL movies-service!** Będzie wyglądał jak:
`https://movies-service.{random-suffix}.{region}.azurecontainerapps.io`

### 4.3 PRZEBUDUJ Frontend z prawdziwymi URLs!
```powershell
# Teraz masz już prawdziwe URLe backendu!
# Przebuduj frontend z nimi:

docker build -t moviesappregistry.azurecr.io/frontend:latest `
  --build-arg VITE_AUTH_API=https://auth-service.{TWOJ_SUFFIX}.westeurope.azurecontainerapps.io `
  --build-arg VITE_MOVIES_API_URL=https://movies-service.{TWOJ_SUFFIX}.westeurope.azurecontainerapps.io `
  ./frontend

docker push moviesappregistry.azurecr.io/frontend:latest
```

### 4.4 Deploy Frontend
```powershell
az containerapp create `
  --name frontend `
  --resource-group movies-app-rg `
  --environment movies-app-env `
  --image moviesappregistry.azurecr.io/frontend:latest `
  --registry-server moviesappregistry.azurecr.io `
  --registry-username moviesappregistry `
  --registry-password "TWOJE_HASLO_Z_ACR" `
  --target-port 80 `
  --ingress external `
  --min-replicas 1 `
  --max-replicas 5 `
  --cpu 0.25 `
  --memory 0.5Gi
```

---

## 🎉 Gotowe!

Aplikacja jest dostępna pod adresem:
`https://frontend.{random-suffix}.{region}.azurecontainerapps.io`

---

## 🔄 Aktualizacja aplikacji

Gdy zmienisz kod, musisz:

```powershell
# 1. Zbuduj nowy obraz
docker build -t moviesappregistry.azurecr.io/auth-service:v2 `
  -f services/auth-service/Dockerfile .

# 2. Wyślij do ACR
docker push moviesappregistry.azurecr.io/auth-service:v2

# 3. Zaktualizuj Container App
az containerapp update `
  --name auth-service `
  --resource-group movies-app-rg `
  --image moviesappregistry.azurecr.io/auth-service:v2
```

---

## 📊 Monitorowanie

```powershell
# Logi aplikacji
az containerapp logs show `
  --name auth-service `
  --resource-group movies-app-rg `
  --follow

# Status aplikacji
az containerapp show `
  --name auth-service `
  --resource-group movies-app-rg `
  --query properties.latestRevisionFqdn
```

---

## 💰 Koszty

- Container Apps: **Pay-as-you-go** (płacisz za użycie CPU/RAM)
- Container Registry (Basic): ~5 USD/miesiąc
- MongoDB Atlas: Twoja istniejąca instancja

**Przewidywany koszt dla małego ruchu:** 10-20 USD/miesiąc

---

## 🚫 Usunięcie wszystkiego

```powershell
az group delete --name movies-app-rg --yes --no-wait
```

---

## 🔐 Bezpieczeństwo - WAŻNE!

### Zmień JWT_SECRET na bezpieczny!
```powershell
# Wygeneruj bezpieczny sekret
$secret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})

# Zaktualizuj Container App
az containerapp update `
  --name auth-service `
  --resource-group movies-app-rg `
  --set-env-vars JWT_SECRET=$secret
```

### Użyj Azure Key Vault (opcjonalne, zaawansowane)
```powershell
# Utwórz Key Vault
az keyvault create `
  --name movies-app-vault `
  --resource-group movies-app-rg `
  --location westeurope

# Dodaj secret
az keyvault secret set `
  --vault-name movies-app-vault `
  --name MongoConnectionString `
  --value "mongodb+srv://..."
```

---

## 📝 Różnice lokalne vs Azure

| Aspekt | Lokalnie | Azure Container Apps |
|--------|----------|---------------------|
| URLs | localhost:8000 | https://auth-service.{suffix}.azurecontainerapps.io |
| Networking | Docker network | Managed by Azure |
| HTTPS | Brak | Automatyczne (Let's Encrypt) |
| Skalowanie | Manualne | Automatyczne (1-10 replik) |
| Monitoring | docker logs | Azure Monitor + Log Analytics |
| Koszty | Tylko energia | Pay-as-you-go |

---

## ❓ FAQ

**Q: Czy muszę przebudowywać frontend przy każdej zmianie backendu?**
A: Nie! Tylko gdy zmieniają się URLe. Jeśli backend działa pod tym samym URL, wystarczy zaktualizować backend.

**Q: Czy mogę użyć własnej domeny?**
A: Tak! Azure Container Apps wspiera custom domains:
```powershell
az containerapp hostname add `
  --name frontend `
  --resource-group movies-app-rg `
  --hostname www.mojaaplikacja.pl
```

**Q: Jak dodać SSL dla custom domain?**
A: Azure automatycznie generuje certyfikat Let's Encrypt dla twoich domen!

**Q: Czy mogę mieć osobne środowiska (dev, staging, prod)?**
A: Tak! Stwórz osobne Resource Groups lub używaj Container Apps revisions.
