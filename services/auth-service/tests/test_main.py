from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    # Upewnij się, że ten JSON poniżej pasuje do tego, co zwraca Twój "/" w auth-service!
    # Jeśli zwracasz np. {"status": "ok"}, zmień to tutaj.
    # assert response.json() == {"message": "Auth Service is running"}