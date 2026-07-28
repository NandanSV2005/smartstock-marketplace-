from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.payments import router as payments_router

app = FastAPI(title="SmartStock API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(payments_router)

@app.get("/")
def read_root():
    return {"message": "SmartStock Payment API operational"}
