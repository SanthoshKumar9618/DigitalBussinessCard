from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import Contact
from app.schemas.contact_schema import ContactCreate, ContactOut
from app.utils.jwt_handler import get_current_user
from app.services import contact_service

router = APIRouter(prefix="/contacts", tags=["Contacts"])


# -----------------------------
# SAVE CONTACT (QR / NFC)
# -----------------------------
@router.post("/", response_model=ContactOut, status_code=status.HTTP_201_CREATED)
async def save_contact(
    payload: ContactCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    contact = contact_service.add_contact(db, current_user.id, payload)
    return contact


# -----------------------------
# LIST CONTACTS (AUTO LOAD)
# -----------------------------
@router.get("/", response_model=List[ContactOut])
def list_contacts(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return contact_service.list_contacts(db, current_user.id, skip, limit)


# -----------------------------
# SEARCH CONTACTS
# -----------------------------
@router.get("/search", response_model=List[ContactOut])
def search_contacts(
    q: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return contact_service.search_contacts(db, current_user.id, q)



# -----------------------------
# DELETE CONTACT
# -----------------------------
@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(
    contact_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    success = contact_service.delete_contact(
        db,
        current_user.id,
        contact_id
    )

    if not success:
        raise HTTPException(status_code=404, detail="Contact not found")
