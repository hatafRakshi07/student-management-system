from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.utils.auth_deps import require_admin
from app.services.audit_service import verify_and_repair_fee_data

router = APIRouter(prefix="/api/audit", tags=["Audit & Integrity"])

@router.get("/fee-system")
def audit_fee_system(_=Depends(require_admin), db: Session = Depends(get_db)):
    """
    Phases 1 & 2 Audit & Verification Endpoint:
    Checks orphan records, 1:1 summary mappings, duplicate receipts, recalculates summary balances,
    and returns full audit status.
    """
    return verify_and_repair_fee_data(db)
