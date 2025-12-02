FROM python:3.11-slim

WORKDIR /app

# Kopiuj requirements.txt z katalogu serwisu
COPY services/movies-service/requirements.txt .

# Instaluj zależności
RUN pip install --no-cache-dir -r requirements.txt

# Kopiuj shared NAJPIERW (żeby był na tym samym poziomie co app/)
COPY services/shared ./shared

# Kopiuj kod aplikacji
COPY services/movies-service/app/ ./app/

COPY services/movies-service/tests/ ./tests/

# Dodaj /app do PYTHONPATH żeby Python znalazł moduł 'shared'
ENV PYTHONPATH=/app

# Eksponuj port
EXPOSE 8001

# Uruchom aplikację (pełna ścieżka do uvicorn)
CMD ["/usr/local/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]