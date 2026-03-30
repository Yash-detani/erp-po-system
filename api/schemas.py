from pydantic import BaseModel
from typing import List, Optional


# Vendor Schema
class VendorBase(BaseModel):
    name: str
    contact: str
    rating: float


class VendorCreate(VendorBase):
    pass


class Vendor(VendorBase):
    id: int

    class Config:
        orm_mode = True


# Product Schema
class ProductBase(BaseModel):
    name: str
    sku: str
    unit_price: float
    stock_level: int


class ProductCreate(ProductBase):
    pass


class Product(ProductBase):
    id: int

    class Config:
        orm_mode = True


# Purchase Order Item
class PurchaseOrderItemBase(BaseModel):
    product_id: int
    quantity: int
    price: float


class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    pass


class PurchaseOrderItem(PurchaseOrderItemBase):
    id: int

    class Config:
        orm_mode = True


# Purchase Order - Create (no reference_no needed, backend auto-generates)
class PurchaseOrderCreate(BaseModel):
    vendor_id: int
    items: List[PurchaseOrderItemCreate]


# Purchase Order - Response
class PurchaseOrderBase(BaseModel):
    reference_no: str
    vendor_id: int
    status: str


class PurchaseOrder(PurchaseOrderBase):
    id: int
    total_amount: float
    items: List[PurchaseOrderItem]

    class Config:
        orm_mode = True