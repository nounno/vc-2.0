from fastapi import FastAPI
from export_routes import router as export_router
from admin_routes import router as admin_router
from auth_routes import router as auth_router
from suppliers_routes import router as suppliers_router
from products_routes import router as products_router
from quotes_routes import router as quotes_router
from upload_routes import router as upload_router

app = FastAPI()

app.include_router(auth_router)
app.include_router(suppliers_router)
app.include_router(products_router)
app.include_router(quotes_router)
app.include_router(export_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(upload_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "api"}


@app.get("/api/v1/health")
def api_v1_health():
    return {"status": "ok"}


@app.get("/suppliers")
def get_suppliers():
    return {"suppliers": []}


@app.post("/suppliers")
def create_supplier():
    return {"message": "功能未实现"}


@app.get("/skus")
def get_skus():
    return {"skus": []}


@app.post("/skus")
def create_sku():
    return {"message": "功能未实现"}


@app.get("/quotes")
def get_quotes():
    return {"quotes": []}


@app.post("/quotes")
def create_quote():
    return {"message": "功能未实现"}
