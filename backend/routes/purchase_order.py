from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models, schemas
from database import get_db

router = APIRouter()

from auth import verify_token


# Create Purchase Order
@router.post("/purchase-orders/")
def create_purchase_order(po: schemas.PurchaseOrderCreate, db: Session = Depends(get_db)):

    total = 0

    # Calculate total
    for item in po.items:
        product = db.query(models.Product).filter(
        models.Product.id == item.product_id).first()

        product.stock_level += item.quantity
        total += product.unit_price * item.quantity

    # Add 5% tax
    total = total + (total * 0.05)

    # Auto-generate reference_no
    last_po = db.query(models.PurchaseOrder).order_by(models.PurchaseOrder.id.desc()).first()
    next_id = last_po.id + 1 if last_po else 1
    generated_reference = f"PO-{1000 + next_id}"

    db_po = models.PurchaseOrder(
        reference_no=generated_reference,
        vendor_id=po.vendor_id,
        status="Pending",
        total_amount=total
    )

    db.add(db_po)
    db.commit()
    db.refresh(db_po)

    # Add Items
    for item in po.items:
        db_item = models.PurchaseOrderItem(
            po_id=db_po.id,
            product_id=item.product_id,
            quantity=item.quantity,
            price=item.price
        )

        db.add(db_item)

    db.commit()

    return {"message": "Purchase Order Created", "total": total, "reference_no": generated_reference}


# Get All Purchase Orders
@router.get("/purchase-orders/")
def get_po(db: Session = Depends(get_db)):   # Removed Depends(verify_token)

    orders = db.query(models.PurchaseOrder).all()

    result = []

    for order in orders:
        result.append({
            "id": order.id,
            "reference_no": order.reference_no,
            "vendor": order.vendor.name,
            "total_amount": order.total_amount,
            "status": order.status
        })

    return result

@router.put("/purchase-orders/{id}")
def update_status(id:int, data:dict, db:Session = Depends(get_db)):

    po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == id).first()

    po.status = data["status"]

    db.commit()

    return {"message":"Status Updated"}

@router.delete("/purchase-orders/{id}")
def delete_purchase_order(id: int, db: Session = Depends(get_db)):
    po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == id).first()
    
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
        
    # Delete associated items first to avoid foreign key constraint errors
    db.query(models.PurchaseOrderItem).filter(models.PurchaseOrderItem.po_id == id).delete()
    
    # Delete the PO
    db.delete(po)
    db.commit()
    
    return {"message": "Purchase Order Deleted Successfully"}
