import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from app.main import app

# --- MOCKOWANIE BAZY DANYCH ---
@pytest.fixture(scope="module", autouse=True)
def setup_mocks():
    # 1. Tworzymy fałszywą bazę
    mock_db = MagicMock()
    
    # 2. Patchujemy funkcje w app.main
    with patch("app.main.get_client"), \
         patch("app.main.get_db", return_value=mock_db), \
         patch("app.main.run_blocking") as mock_run_blocking:
        
        # Udajemy, że run_blocking wykonuje funkcję natychmiast
        async def fake_run_blocking(func, *args, **kwargs):
            return func(*args, **kwargs)
        mock_run_blocking.side_effect = fake_run_blocking
        
        yield

# --- KLIENT ---
@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

# --- TESTY ---

def test_read_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Auth Service is running"}

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    # Ponieważ zmockowaliśmy bazę, health check powinien zwrócić status 'healthy'
    assert response.json()["status"] == "healthy"