import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app, verify_token

# --- KONFIGURACJA MOCKÓW (Udawanie Bazy) ---

# Ten kod uruchomi się RAZ przed wszystkimi testami w tym pliku
@pytest.fixture(scope="module", autouse=True)
def setup_mocks():
    # 1. Tworzymy fałszywą bazę danych
    mock_db = MagicMock()
    # Ustawiamy, co ma zwracać zapytanie o gatunki (dla testu /genres)
    mock_db.Movies.distinct.return_value = ["Action", "Comedy", "Sci-Fi"]

    # 2. Patchujemy funkcje w 'app.main', żeby nie łączyły się z prawdziwym Mongo
    with patch("app.main.get_client"), \
         patch("app.main.get_db", return_value=mock_db), \
         patch("app.main.run_blocking") as mock_run_blocking:
        
        # Udajemy, że run_blocking wykonuje się natychmiast (bez wątków)
        async def fake_run_blocking(func, *args, **kwargs):
            return func(*args, **kwargs)
        mock_run_blocking.side_effect = fake_run_blocking
        
        yield  # Tutaj uruchamiają się testy

# --- KLIENT TESTOWY ---

@pytest.fixture
def client():
    # Mockowanie autoryzacji (żeby nie trzeba było tokena)
    async def mock_verify_token():
        return {"id": "test_user_id", "role": "user", "email": "test@example.com"}
    
    app.dependency_overrides[verify_token] = mock_verify_token
    
    # Tworzymy klienta w kontekście (to uruchamia startup_event z naszymi mockami)
    with TestClient(app) as c:
        yield c

# --- TESTY ---

def test_read_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Movies Service is running"}

def test_genres_endpoint(client):
    response = client.get("/genres")
    
    # Teraz powinno zwrócić 200, bo baza jest zmockowana i "działa"
    assert response.status_code == 200
    
    data = response.json()
    assert "genres" in data
    assert "Action" in data["genres"]  # Sprawdzamy czy zwróciło to, co ustawiliśmy w mocku