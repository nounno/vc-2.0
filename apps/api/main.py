from fastapi import FastAPI
from export_routes import router as export_router

app = FastAPI()
app.include_router(export_router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok", "service": "api"}


@app.get("/api/v1/health")
def api_v1_health():
    return {"status": "ok"}


# --- Reservation: Supplier routes ---
@app.get("/suppliers")
def get_suppliers():
    return {"suppliers": []}


@app.post("/suppliers")
def create_supplier():
    return {"message": "not implemented"}


# --- Reservation: SKU routes ---
@app.get("/skus")
def get_skus():
    return {"skus": []}


@app.post("/skus")
def create_sku():
    return {"message": "not implemented"}


# --- Reservation: Quote routes ---
@app.get("/quotes")
def get_quotes():
    return {"quotes": []}


@app.post("/quotes")
def create_quote():
    return {"message": "not implemented"}
