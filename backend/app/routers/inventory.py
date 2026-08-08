from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from app.database import get_db
from app.models.expansion import InventoryAssetRecord, AssetStatus
from app.utils.auth_deps import require_teacher_or_admin

router = APIRouter(prefix="/api/inventory", tags=["Inventory"])

@router.get("/admin/dashboard")
def inventory_dashboard(_=Depends(require_teacher_or_admin), db: Session = Depends(get_db)):
    total_assets = db.query(InventoryAssetRecord).count()
    available_assets = db.query(InventoryAssetRecord).filter(InventoryAssetRecord.status == AssetStatus.AVAILABLE).count()
    assigned_assets = db.query(InventoryAssetRecord).filter(InventoryAssetRecord.status == AssetStatus.ASSIGNED).count()
    total_val = db.query(func.sum(InventoryAssetRecord.purchase_price)).scalar() or 0.0

    return {
        "total_assets": total_assets,
        "available_assets": available_assets,
        "assigned_assets": assigned_assets,
        "total_valuation": float(total_val)
    }

@router.get("/assets")
def list_assets(search: Optional[str] = None, _=Depends(require_teacher_or_admin), db: Session = Depends(get_db)):
    q = db.query(InventoryAssetRecord)
    if search:
        s = f"%{search}%"
        q = q.filter(InventoryAssetRecord.item_name.ilike(s) | InventoryAssetRecord.asset_code.ilike(s) | InventoryAssetRecord.category.ilike(s))
    
    records = q.order_by(InventoryAssetRecord.id.desc()).all()
    return {
        "assets": [{
            "id": r.id,
            "asset_code": r.asset_code,
            "item_name": r.item_name,
            "category": r.category,
            "location": r.location,
            "purchase_price": r.purchase_price,
            "condition": r.condition,
            "status": r.status.value if hasattr(r.status, 'value') else str(r.status),
            "purchase_date": r.purchase_date.isoformat() if r.purchase_date else None
        } for r in records]
    }
