from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Pydantic Models
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None

class SessionExchangeRequest(BaseModel):
    session_id: str

class Plant(BaseModel):
    plant_id: str
    plant_name: str
    created_by: str
    created_at: str

class PlantCreate(BaseModel):
    plant_name: str

class Product(BaseModel):
    product_id: str
    product_name: str
    plant_id: str
    quality_status: str
    created_at: str

class ProductCreate(BaseModel):
    product_name: str
    plant_id: str
    quality_status: str = "onspec"

class ProductUpdate(BaseModel):
    product_name: Optional[str] = None
    quality_status: Optional[str] = None

class ShiftIncharge(BaseModel):
    incharge_id: str
    name: str
    email: str
    plant_id: str
    shift_type: str
    crew_members: List[str] = []
    follow_up_date: Optional[str] = None
    created_at: str

class ShiftInchargeCreate(BaseModel):
    name: str
    email: str
    plant_id: str
    shift_type: str
    crew_members: List[str] = []
    follow_up_date: Optional[str] = None

class ShiftInchargeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    shift_type: Optional[str] = None
    crew_members: Optional[List[str]] = None
    follow_up_date: Optional[str] = None

class Note(BaseModel):
    note_id: str
    shift_incharge_id: str
    note_text: str
    created_at: str

class NoteCreate(BaseModel):
    shift_incharge_id: str
    note_text: str

class ProductionRecord(BaseModel):
    record_id: str
    plant_id: str
    product_id: str
    shift_incharge_id: str
    shift_type: str
    shift_production_value: float
    shift_status: str
    day_production_value: Optional[float] = None
    weekly_target: Optional[float] = None
    monthly_target: Optional[float] = None
    reasons_not_achieved: Optional[str] = None
    date: str
    created_at: str

class ProductionRecordCreate(BaseModel):
    plant_id: str
    product_id: str
    shift_incharge_id: str
    shift_type: str
    shift_production_value: float
    shift_status: str
    day_production_value: Optional[float] = None
    weekly_target: Optional[float] = None
    monthly_target: Optional[float] = None
    reasons_not_achieved: Optional[str] = None
    date: str

# Helper function to get user from session token
async def get_current_user(request: Request) -> User:
    # Check cookie first, then Authorization header
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session in database
    session_doc = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user_doc)

# Auth endpoints
@api_router.post("/auth/session")
async def exchange_session(request: SessionExchangeRequest, response: Response):
    try:
        async with httpx.AsyncClient() as client:
            emergent_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": request.session_id}
            )
            
            if emergent_response.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid session ID")
            
            data = emergent_response.json()
            
            # Create or update user
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            existing_user = await db.users.find_one({"email": data["email"]}, {"_id": 0})
            
            if existing_user:
                user_id = existing_user["user_id"]
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": {
                        "name": data["name"],
                        "picture": data.get("picture")
                    }}
                )
            else:
                await db.users.insert_one({
                    "user_id": user_id,
                    "email": data["email"],
                    "name": data["name"],
                    "picture": data.get("picture"),
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
            
            # Create session
            session_token = data["session_token"]
            expires_at = datetime.now(timezone.utc) + timedelta(days=7)
            
            await db.user_sessions.insert_one({
                "user_id": user_id,
                "session_token": session_token,
                "expires_at": expires_at.isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            # Set cookie
            response.set_cookie(
                key="session_token",
                value=session_token,
                httponly=True,
                secure=True,
                samesite="none",
                path="/",
                max_age=7*24*60*60
            )
            
            # Get user data
            user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
            return user_doc
            
    except Exception as e:
        logging.error(f"Session exchange error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out successfully"}

# Plant endpoints
@api_router.get("/plants", response_model=List[Plant])
async def get_plants(request: Request):
    user = await get_current_user(request)
    plants = await db.plants.find({}, {"_id": 0}).to_list(1000)
    return plants

@api_router.post("/plants", response_model=Plant)
async def create_plant(plant: PlantCreate, request: Request):
    user = await get_current_user(request)
    plant_id = f"plant_{uuid.uuid4().hex[:12]}"
    plant_doc = {
        "plant_id": plant_id,
        "plant_name": plant.plant_name,
        "created_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.plants.insert_one(plant_doc)
    return Plant(**plant_doc)

@api_router.put("/plants/{plant_id}", response_model=Plant)
async def update_plant(plant_id: str, plant: PlantCreate, request: Request):
    user = await get_current_user(request)
    result = await db.plants.update_one(
        {"plant_id": plant_id},
        {"$set": {"plant_name": plant.plant_name}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Plant not found")
    updated_plant = await db.plants.find_one({"plant_id": plant_id}, {"_id": 0})
    return Plant(**updated_plant)

@api_router.delete("/plants/{plant_id}")
async def delete_plant(plant_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.plants.delete_one({"plant_id": plant_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plant not found")
    return {"message": "Plant deleted successfully"}

# Product endpoints
@api_router.get("/products", response_model=List[Product])
async def get_products(request: Request, plant_id: Optional[str] = None):
    user = await get_current_user(request)
    query = {"plant_id": plant_id} if plant_id else {}
    products = await db.products.find(query, {"_id": 0}).to_list(1000)
    return products

@api_router.post("/products", response_model=Product)
async def create_product(product: ProductCreate, request: Request):
    user = await get_current_user(request)
    product_id = f"product_{uuid.uuid4().hex[:12]}"
    product_doc = {
        "product_id": product_id,
        "product_name": product.product_name,
        "plant_id": product.plant_id,
        "quality_status": product.quality_status,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.products.insert_one(product_doc)
    return Product(**product_doc)

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product: ProductUpdate, request: Request):
    user = await get_current_user(request)
    update_data = {k: v for k, v in product.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.products.update_one(
        {"product_id": product_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    updated_product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    return Product(**updated_product)

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.products.delete_one({"product_id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully"}

# Shift Incharge endpoints
@api_router.get("/shift-incharges", response_model=List[ShiftIncharge])
async def get_shift_incharges(request: Request, plant_id: Optional[str] = None):
    user = await get_current_user(request)
    query = {"plant_id": plant_id} if plant_id else {}
    incharges = await db.shift_incharges.find(query, {"_id": 0}).to_list(1000)
    return incharges

@api_router.post("/shift-incharges", response_model=ShiftIncharge)
async def create_shift_incharge(incharge: ShiftInchargeCreate, request: Request):
    user = await get_current_user(request)
    incharge_id = f"incharge_{uuid.uuid4().hex[:12]}"
    incharge_doc = {
        "incharge_id": incharge_id,
        "name": incharge.name,
        "email": incharge.email,
        "plant_id": incharge.plant_id,
        "shift_type": incharge.shift_type,
        "crew_members": incharge.crew_members,
        "follow_up_date": incharge.follow_up_date,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.shift_incharges.insert_one(incharge_doc)
    return ShiftIncharge(**incharge_doc)

@api_router.put("/shift-incharges/{incharge_id}", response_model=ShiftIncharge)
async def update_shift_incharge(incharge_id: str, incharge: ShiftInchargeUpdate, request: Request):
    user = await get_current_user(request)
    update_data = {k: v for k, v in incharge.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.shift_incharges.update_one(
        {"incharge_id": incharge_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Shift incharge not found")
    
    updated_incharge = await db.shift_incharges.find_one({"incharge_id": incharge_id}, {"_id": 0})
    return ShiftIncharge(**updated_incharge)

@api_router.delete("/shift-incharges/{incharge_id}")
async def delete_shift_incharge(incharge_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.shift_incharges.delete_one({"incharge_id": incharge_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Shift incharge not found")
    return {"message": "Shift incharge deleted successfully"}

# Notes endpoints
@api_router.get("/notes/{shift_incharge_id}", response_model=List[Note])
async def get_notes(shift_incharge_id: str, request: Request):
    user = await get_current_user(request)
    notes = await db.notes.find({"shift_incharge_id": shift_incharge_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return notes

@api_router.post("/notes", response_model=Note)
async def create_note(note: NoteCreate, request: Request):
    user = await get_current_user(request)
    note_id = f"note_{uuid.uuid4().hex[:12]}"
    note_doc = {
        "note_id": note_id,
        "shift_incharge_id": note.shift_incharge_id,
        "note_text": note.note_text,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notes.insert_one(note_doc)
    return Note(**note_doc)

@api_router.delete("/notes/{note_id}")
async def delete_note(note_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.notes.delete_one({"note_id": note_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"message": "Note deleted successfully"}

# Production records endpoints
@api_router.get("/production-records", response_model=List[ProductionRecord])
async def get_production_records(request: Request, plant_id: Optional[str] = None, date: Optional[str] = None):
    user = await get_current_user(request)
    query = {}
    if plant_id:
        query["plant_id"] = plant_id
    if date:
        query["date"] = date
    records = await db.production_records.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return records

@api_router.post("/production-records", response_model=ProductionRecord)
async def create_production_record(record: ProductionRecordCreate, request: Request):
    user = await get_current_user(request)
    record_id = f"record_{uuid.uuid4().hex[:12]}"
    record_doc = {
        "record_id": record_id,
        **record.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.production_records.insert_one(record_doc)
    return ProductionRecord(**record_doc)

# Dashboard metrics
@api_router.get("/dashboard/metrics")
async def get_dashboard_metrics(request: Request):
    user = await get_current_user(request)
    
    # Get counts
    total_plants = await db.plants.count_documents({})
    total_products = await db.products.count_documents({})
    total_shift_incharges = await db.shift_incharges.count_documents({})
    
    # Get today's production
    today = datetime.now(timezone.utc).date().isoformat()
    today_records = await db.production_records.find({"date": today}, {"_id": 0}).to_list(1000)
    today_production = sum(r.get("shift_production_value", 0) for r in today_records)
    
    # Get quality status breakdown
    onspec_count = await db.products.count_documents({"quality_status": "onspec"})
    offspec_count = await db.products.count_documents({"quality_status": "offspec"})
    
    # Get overdue follow-ups
    all_incharges = await db.shift_incharges.find({}, {"_id": 0}).to_list(1000)
    overdue_count = 0
    for incharge in all_incharges:
        if incharge.get("follow_up_date"):
            follow_up = datetime.fromisoformat(incharge["follow_up_date"]).date()
            if follow_up < datetime.now(timezone.utc).date():
                overdue_count += 1
    
    # Get shift performance (last 7 days)
    shift_performance = []
    for i in range(7):
        date = (datetime.now(timezone.utc).date() - timedelta(days=i)).isoformat()
        records = await db.production_records.find({"date": date}, {"_id": 0}).to_list(1000)
        shift_a = sum(r.get("shift_production_value", 0) for r in records if r.get("shift_type") == "A")
        shift_b = sum(r.get("shift_production_value", 0) for r in records if r.get("shift_type") == "B")
        shift_c = sum(r.get("shift_production_value", 0) for r in records if r.get("shift_type") == "C")
        shift_performance.append({
            "date": date,
            "shift_a": shift_a,
            "shift_b": shift_b,
            "shift_c": shift_c
        })
    
    return {
        "total_plants": total_plants,
        "total_products": total_products,
        "total_shift_incharges": total_shift_incharges,
        "today_production": today_production,
        "onspec_count": onspec_count,
        "offspec_count": offspec_count,
        "overdue_followups": overdue_count,
        "shift_performance": list(reversed(shift_performance))
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()