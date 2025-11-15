import os
import hashlib
from datetime import datetime, timedelta
from typing import Optional
from bson import ObjectId

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
from dotenv import load_dotenv

# Import z shared (teraz /app/shared dzięki PYTHONPATH=/app)
from shared.database import get_client, get_db

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

class UserUpdate(BaseModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    currentPassword: Optional[str] = None
    newPassword: Optional[str] = None

class ClientResponse(BaseModel):
    id: str
    firstName: str
    lastName: str
    email: str
    address: str
    phone: str
    role: str
    registrationDate: datetime
    activeRentalsCount: int

class ClientCreate(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    password: str
    address: Optional[str] = ""
    phone: Optional[str] = ""
    role: str = "user"

class ClientUpdate(BaseModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    newPassword: Optional[str] = None
    role: Optional[str] = None

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

def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden. Admin role required."
        )
    return current_user

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
    
@app.put("/update-profile", response_model=Token)
async def update_profile(
    user_data: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    db = get_db_connection()
    
    update_fields = {}
    
    # Aktualizuj podstawowe dane
    if user_data.firstName:
        update_fields["firstName"] = user_data.firstName
    if user_data.lastName:
        update_fields["lastName"] = user_data.lastName
    if user_data.phone is not None:
        update_fields["phone"] = user_data.phone
    if user_data.address is not None:
        update_fields["address"] = user_data.address
    
    # Zmiana hasła
    if user_data.newPassword:
        if not user_data.currentPassword:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is required to change password"
            )
        
        # Weryfikuj aktualne hasło
        if not verify_password(user_data.currentPassword, current_user["passwordHash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        update_fields["passwordHash"] = get_password_hash(user_data.newPassword)
    
    # Aktualizuj w bazie
    if update_fields:
        db.Clients.update_one(
            {"_id": current_user["_id"]},
            {"$set": update_fields}
        )
    
    # Pobierz zaktualizowane dane
    updated_user = db.Clients.find_one({"_id": current_user["_id"]})
    
    # Utwórz nowy token
    access_token_expires = timedelta(minutes=JWT_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": updated_user["email"]}, expires_delta=access_token_expires
    )
    
    user_response = UserResponse(
        id=str(updated_user["_id"]),
        firstName=updated_user["firstName"],
        lastName=updated_user["lastName"],
        email=updated_user["email"],
        address=updated_user["address"],
        phone=updated_user["phone"],
        role=updated_user["role"],
        registrationDate=updated_user["registrationDate"],
        activeRentalsCount=updated_user["activeRentalsCount"]
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response
    }

@app.get("/clients", response_model=list[ClientResponse])
async def get_all_clients(
    current_user: dict = Depends(require_admin)
):
    """Pobiera listę wszystkich klientów (tylko admin)"""
    db = get_db_connection()
    
    clients = db.Clients.find({})
    
    return [
        ClientResponse(
            id=str(client["_id"]),
            firstName=client["firstName"],
            lastName=client["lastName"],
            email=client["email"],
            address=client.get("address", ""),
            phone=client.get("phone", ""),
            role=client["role"],
            registrationDate=client["registrationDate"],
            activeRentalsCount=client.get("activeRentalsCount", 0)
        )
        for client in clients
    ]

@app.post("/clients", response_model=ClientResponse)
async def create_client(
    client_data: ClientCreate,
    current_user: dict = Depends(require_admin)
):
    """Tworzy nowego klienta (tylko admin)"""
    db = get_db_connection()
    
    # Sprawdź czy użytkownik już istnieje
    existing_user = db.Clients.find_one({"email": client_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Przygotuj dane klienta
    new_client = {
        "firstName": client_data.firstName,
        "lastName": client_data.lastName,
        "email": client_data.email,
        "passwordHash": get_password_hash(client_data.password),
        "address": client_data.address,
        "phone": client_data.phone,
        "role": client_data.role,
        "registrationDate": datetime.utcnow(),
        "activeRentalsCount": 0
    }
    
    try:
        result = db.Clients.insert_one(new_client)
        new_client["_id"] = result.inserted_id
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    return ClientResponse(
        id=str(new_client["_id"]),
        firstName=new_client["firstName"],
        lastName=new_client["lastName"],
        email=new_client["email"],
        address=new_client["address"],
        phone=new_client["phone"],
        role=new_client["role"],
        registrationDate=new_client["registrationDate"],
        activeRentalsCount=new_client["activeRentalsCount"]
    )

@app.delete("/clients/{client_id}")
async def delete_client(
    client_id: str,
    current_user: dict = Depends(require_admin)
):
    """Usuwa klienta (tylko admin)"""
    db = get_db_connection()
    
    # Nie pozwól usunąć samego siebie
    if str(current_user["_id"]) == client_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    try:
        from bson import ObjectId
        result = db.Clients.delete_one({"_id": ObjectId(client_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid client ID format"
        )
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    return {"message": "Client deleted successfully"}

@app.put("/clients/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: str,
    client_data: ClientUpdate,
    current_user: dict = Depends(require_admin)
):
    """Aktualizuje dane klienta (tylko admin)"""
    db = get_db_connection()
    
    try:
        object_id = ObjectId(client_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid client ID format"
        )
    
    # Sprawdź czy klient istnieje
    existing_client = db.Clients.find_one({"_id": object_id})
    if not existing_client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )
    
    update_fields = {}
    
    # Aktualizuj podstawowe dane
    if client_data.firstName:
        update_fields["firstName"] = client_data.firstName
    if client_data.lastName:
        update_fields["lastName"] = client_data.lastName
    if client_data.phone is not None:
        update_fields["phone"] = client_data.phone
    if client_data.address is not None:
        update_fields["address"] = client_data.address
    if client_data.role is not None:
        # Nie pozwól zmienić swojej własnej roli
        if str(current_user["_id"]) == client_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot change your own role"
            )
        update_fields["role"] = client_data.role
    
    # Zmiana hasła (bez wymagania starego hasła dla admina)
    if client_data.newPassword:
        update_fields["passwordHash"] = get_password_hash(client_data.newPassword)
    
    # Aktualizuj w bazie
    if update_fields:
        db.Clients.update_one(
            {"_id": object_id},
            {"$set": update_fields}
        )
    
    # Pobierz zaktualizowane dane
    updated_client = db.Clients.find_one({"_id": object_id})
    
    return ClientResponse(
        id=str(updated_client["_id"]),
        firstName=updated_client["firstName"],
        lastName=updated_client["lastName"],
        email=updated_client["email"],
        address=updated_client["address"],
        phone=updated_client["phone"],
        role=updated_client["role"],
        registrationDate=updated_client["registrationDate"],
        activeRentalsCount=updated_client["activeRentalsCount"]
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)