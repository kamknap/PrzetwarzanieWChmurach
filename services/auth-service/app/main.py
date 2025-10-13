import os
import sys
import hashlib
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
from dotenv import load_dotenv

# Dodaj ścieżkę do shared
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'shared'))
from database import get_client, get_db

load_dotenv()

# Konfiguracja
JWT_SECRET = os.getenv("JWT_SECRET", "your-super-secret-jwt-key-change-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256") 
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "30"))

# Konfiguracja haszowania haseł
try:
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    USE_BCRYPT = True
except Exception as e:
    print(f"Warning: bcrypt not available, using SHA256: {e}")
    USE_BCRYPT = False

# Konfiguracja security
security = HTTPBearer()

app = FastAPI(title="Auth Service", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # W produkcji ustaw konkretne domeny
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modele Pydantic
class UserRegister(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    password: str
    address: Optional[str] = ""
    phone: Optional[str] = ""

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    firstName: str
    lastName: str
    email: str
    address: str
    phone: str
    role: str
    registrationDate: datetime
    activeRentalsCount: int

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Funkcje pomocnicze
def verify_password(plain_password: str, hashed_password: str) -> bool:
    if USE_BCRYPT:
        try:
            # Bcrypt ma limit 72 bajtów, więc obcinamy hasło jeśli jest za długie
            if len(plain_password.encode('utf-8')) > 72:
                plain_password = plain_password[:72]
            return pwd_context.verify(plain_password, hashed_password)
        except Exception:
            # Fallback do SHA256
            pass
    
    # Prosty SHA256 jako fallback
    salt = "video_rental_salt_2024"  # W produkcji użyj losowej soli dla każdego użytkownika
    hash_check = hashlib.sha256((plain_password + salt).encode()).hexdigest()
    return hash_check == hashed_password

def get_password_hash(password: str) -> str:
    if USE_BCRYPT:
        try:
            # Bcrypt ma limit 72 bajtów, więc obcinamy hasło jeśli jest za długie
            if len(password.encode('utf-8')) > 72:
                password = password[:72]
            return pwd_context.hash(password)
        except Exception as e:
            print(f"Bcrypt failed, using SHA256: {e}")
    
    # Prosty SHA256 jako fallback
    salt = "video_rental_salt_2024"  # W produkcji użyj losowej soli dla każdego użytkownika
    return hashlib.sha256((password + salt).encode()).hexdigest()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def get_db_connection():
    client = get_client()
    db = get_db(client)
    return db

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    db = get_db_connection()
    user = db.Clients.find_one({"email": email})
    if user is None:
        raise credentials_exception
    return user

# Endpointy
@app.get("/")
def read_root():
    return {"message": "Auth Service is running"}

@app.post("/register", response_model=Token)
async def register(user: UserRegister):
    db = get_db_connection()
    
    # Sprawdź czy użytkownik już istnieje
    existing_user = db.Clients.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Przygotuj dane użytkownika
    user_data = {
        "firstName": user.firstName,
        "lastName": user.lastName,
        "email": user.email,
        "passwordHash": get_password_hash(user.password),
        "address": user.address,
        "phone": user.phone,
        "role": "user",
        "registrationDate": datetime.utcnow(),
        "activeRentalsCount": 0
    }
    
    try:
        result = db.Clients.insert_one(user_data)
        user_data["_id"] = result.inserted_id
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Utwórz token
    access_token_expires = timedelta(minutes=JWT_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    # Przygotuj odpowiedź
    user_response = UserResponse(
        id=str(user_data["_id"]),
        firstName=user_data["firstName"],
        lastName=user_data["lastName"],
        email=user_data["email"],
        address=user_data["address"],
        phone=user_data["phone"],
        role=user_data["role"],
        registrationDate=user_data["registrationDate"],
        activeRentalsCount=user_data["activeRentalsCount"]
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response
    }

@app.post("/login", response_model=Token)
async def login(user: UserLogin):
    db = get_db_connection()
    
    # Znajdź użytkownika
    db_user = db.Clients.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["passwordHash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Utwórz token
    access_token_expires = timedelta(minutes=JWT_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    # Przygotuj odpowiedź
    user_response = UserResponse(
        id=str(db_user["_id"]),
        firstName=db_user["firstName"],
        lastName=db_user["lastName"],
        email=db_user["email"],
        address=db_user["address"],
        phone=db_user["phone"],
        role=db_user["role"],
        registrationDate=db_user["registrationDate"],
        activeRentalsCount=db_user["activeRentalsCount"]
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response
    }

@app.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=str(current_user["_id"]),
        firstName=current_user["firstName"],
        lastName=current_user["lastName"],
        email=current_user["email"],
        address=current_user["address"],
        phone=current_user["phone"],
        role=current_user["role"],
        registrationDate=current_user["registrationDate"],
        activeRentalsCount=current_user["activeRentalsCount"]
    )

@app.get("/health")
def health_check():
    try:
        db = get_db_connection()
        db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)