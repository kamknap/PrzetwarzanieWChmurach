FROM python:3.11-slim

WORKDIR /app

# Kopiuj requirements.txt z katalogu serwisu
COPY services/auth-service/requirements.txt .

# Instaluj zależności
RUN pip install --no-cache-dir -r requirements.txt

# Kopiuj shared NAJPIERW (żeby był na tym samym poziomie co app/)
COPY services/shared ./shared

# Kopiuj kod aplikacji
COPY services/auth-service/app/ ./app/

# Dodaj /app do PYTHONPATH żeby Python znalazł moduł 'shared'
ENV PYTHONPATH=/app

# Eksponuj port
EXPOSE 8000

# Uruchom aplikację (pełna ścieżka do uvicorn)
CMD ["/usr/local/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]