# Auth Service

## Uruchamianie

### 1. Instalacja zależności

```bash
cd services/auth-service
pip install -r requirements.txt
```

### 2. Konfiguracja środowiska

Upewnij się, że plik `.env` w głównym katalogu projektu zawiera:

```env
MONGO_URI=your-mongodb-connection-string
MONGO_DATABASE=Video
JWT_SECRET=your-secret-key
JWT_EXPIRE_MINUTES=30
```

### 3. Uruchomienie serwera

```bash
# Z katalogu auth-service (zalecane)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Lub uruchom bezpośrednio z katalogu app/:

```bash
cd app
python main.py
```

Serwer będzie dostępny pod adresem: `http://localhost:8000`

