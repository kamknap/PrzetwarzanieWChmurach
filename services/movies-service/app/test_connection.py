import os
import sys
from pathlib import Path

# Ensure project root is on sys.path for direct script run
CURRENT_FILE = Path(__file__).resolve()
PROJECT_ROOT = CURRENT_FILE.parents[3]  # .../PrzetwarzanieWChmurach
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from services.shared.database import get_client, get_db, get_collection, ping


# w cmd: python services/movies-service/app/test_connection.py

def main() -> None:
    db_name = os.getenv("MONGO_DATABASE") or "Video"
    coll_name = os.getenv("MONGO_COLLECTION") or "Movies"

    client = get_client()
    # sprawdzenie polaczenia
    ping(client)

    db = get_db(client, db_name)
    coll = get_collection(db, coll_name)

    total = coll.count_documents({})
    print(f"Połączono z bazą. Kolekcja: {db_name}.{coll_name}. Dokumentów: {total}")

    # wyswietlanie tytulow
    docs = coll.find({}, {"title": 1, "_id": 0}).limit(10)
    for d in docs:
        title = d.get("title")
        if title:
            print(f"- {title}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Błąd połączenia: {e}")