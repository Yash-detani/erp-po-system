from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Body, HTTPException
from api.database import engine
import api.models as models

from api.routes import vendor, product, purchase_order
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(vendor.router)
app.include_router(product.router)
app.include_router(purchase_order.router)

@app.get("/")
def read_root():
    return {"message": "ERP PO System Running"}

from api.auth import create_access_token

# Hardcoded credentials for demo
VALID_USERNAME = "admin"
VALID_PASSWORD = "admin123"

@app.post("/login")
def login(data: dict = Body(...)):
    username = data.get("username", "")
    password = data.get("password", "")

    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required")

    if username != VALID_USERNAME or password != VALID_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    user = {
        "username": username
    }

    token = create_access_token(user)

    return {
        "access_token": token,
        "token_type": "bearer"
    }


@app.post("/generate-description")
def generate_description(data: dict = Body(...)):
    product_name = data.get("name")

    description = f"{product_name} is a high-quality product designed for modern business needs. It offers reliability, performance, and excellent value for customers."

    return {
        "description": description
    }
