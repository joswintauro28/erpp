from fastapi import APIRouter, Depends

from app.core.deps import get_current_token_payload
from app.integrations.inventory_client import get_products, get_product as get_product_inv, create_product_inv, update_product_inv, delete_product_inv

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[dict])
async def list_products(
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await get_products(token)


@router.post("", response_model=dict, status_code=201)
async def create_product(
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await create_product_inv(token, body)


@router.get("/{product_id}", response_model=dict)
async def get_product(
    product_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    try:
        return await get_product_inv(token, product_id)
    except Exception:
        from app.core.exceptions import NotFoundException
        raise NotFoundException("Product not found")


@router.put("/{product_id}", response_model=dict)
async def update_product(
    product_id: int,
    body: dict,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    return await update_product_inv(token, product_id, body)


@router.delete("/{product_id}", status_code=204)
async def delete_product(
    product_id: int,
    payload: dict = Depends(get_current_token_payload),
):
    token = payload.get("_raw_token", "")
    await delete_product_inv(token, product_id)
