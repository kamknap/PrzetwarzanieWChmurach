from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_read_root():
    # Sprawdzamy główny endpoint
    response = client.get("/")
    
    # Oczekujemy kodu 200 (OK)
    assert response.status_code == 200
    
    # Oczekujemy dokładnie takiej odpowiedzi, jaką masz w main.py
    assert response.json() == {"message": "Auth Service is running"}

def test_health_check():
    # Sprawdzamy endpoint health (nawet jeśli baza nie działa, powinien zwrócić status)
    response = client.get("/health")
    assert response.status_code == 200
    # Sprawdzamy czy w odpowiedzi jest klucz "status"
    assert "status" in response.json()