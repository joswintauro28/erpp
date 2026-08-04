import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import engine, Base
from app.core.middleware import SecurityHeadersMiddleware

from app.product.models import Product
from app.warehouse.models import Warehouse
from app.stock.models import Stock, StockMovement
from app.supplier.models import Supplier
from app.purchase_order.models import PurchaseOrder, PurchaseOrderItem
from app.serial_number.models import SerialNumber
from app.fulfillment.models import SalesOrderFulfillment, FulfillmentItem

from app.product.router import router as products_router
from app.warehouse.router import router as warehouses_router
from app.stock.router import router as stock_router
from app.supplier.router import router as suppliers_router
from app.purchase_order.router import router as purchase_orders_router
from app.serial_number.router import router as serial_numbers_router
from app.dashboard.router import router as dashboard_router
from app.fulfillment.router import router as fulfillment_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncio
    from app.core.amqp import connect_amqp, disconnect_amqp
    from app.core.worker import run_worker
    await connect_amqp()
    worker_task = asyncio.create_task(run_worker())
    yield
    worker_task.cancel()
    try:
        await worker_task
    except asyncio.CancelledError:
        pass
    await disconnect_amqp()
    await engine.dispose()


app = FastAPI(
    title="DATAVEX Inventory API",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc):
    logging.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


app.include_router(products_router)
app.include_router(warehouses_router)
app.include_router(stock_router)
app.include_router(suppliers_router)
app.include_router(purchase_orders_router)
app.include_router(serial_numbers_router)
app.include_router(dashboard_router)
app.include_router(fulfillment_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/")
async def root():
    return {"message": "DATAVEX Inventory API Running", "status": "healthy"}
