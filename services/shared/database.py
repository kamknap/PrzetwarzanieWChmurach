import os
from typing import Optional

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database


def get_client(uri: Optional[str] = None) -> MongoClient:
    load_dotenv()
    uri = uri or os.getenv("MONGO_URI") or os.getenv("MONGO_URL")
    if not uri:
        raise RuntimeError("Brak MONGO_URI/MONGO_URL w środowisku (.env)")
    return MongoClient(uri, serverSelectionTimeoutMS=5000)


def get_db(client: MongoClient, name: Optional[str] = None) -> Database:
    name = name or os.getenv("MONGO_DATABASE") or "Video"
    return client[name]


def get_collection(db: Database, name: Optional[str] = None) -> Collection:
    name = name or os.getenv("MONGO_COLLECTION") or "Movies"
    return db[name]


def ping(client: MongoClient) -> None:
    client.admin.command("ping")
