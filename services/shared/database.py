import os
from typing import Optional
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.database import Database
from pymongo.collection import Collection

load_dotenv()

# Singleton MongoClient — tworzony raz
_mongo_client: Optional[MongoClient] = None

def get_client(uri: Optional[str] = None) -> MongoClient:
    global _mongo_client
    if _mongo_client is not None:
        return _mongo_client

    uri = uri or os.getenv("MONGO_URI") or os.getenv("MONGO_URL")
    if not uri:
        raise RuntimeError("Brak MONGO_URI/MONGO_URL w środowisku (.env)")
    
    _mongo_client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    return _mongo_client

def get_db(client: MongoClient, name: Optional[str] = None) -> Database:
    name = name or os.getenv("MONGO_DATABASE") or "Video"
    return client[name]

def get_collection(db: Database, name: Optional[str] = None) -> Collection:
    name = name or os.getenv("MONGO_COLLECTION") or "Movies"
    return db[name]

def ping(client: MongoClient) -> None:
    client.admin.command("ping")
