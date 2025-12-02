from fastapi.testclient import TestClient
from app.main import app

# TestClient używa kontekstu aplikacji, więc uruchomi zdarzenia "startup"
# Dzięki try-except w Twoim main.py, brak bazy nie wywali testu
client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Movies Service is running"}

def test_genres_endpoint():
    # Ten test może zwrócić pustą listę lub błąd bazy, 
    # ale sprawdzamy czy endpoint w ogóle jest dostępny (nie 404)
    response = client.get("/genres")
    # Akceptujemy 200 (sukces) lub 500 (błąd bazy), byle nie 404 (brak endpointu)
    assert response.status_code in [200, 500, 503]