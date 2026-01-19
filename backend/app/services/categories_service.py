from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database.models import Contact, Profile

async def search(db: Session, owner_id: str, name=None, company=None, job=None, tag=None):
    query = db.query(Contact, Profile).join(Profile, Contact.target_profile_id == Profile.id)
    query = query.filter(Contact.owner_id == owner_id)

    if name:
        query = query.filter(Profile.display_name.ilike(f"%{name}%"))
    if company:
        query = query.filter(Profile.company.ilike(f"%{company}%"))
    if job:
        query = query.filter(Profile.job_title.ilike(f"%{job}%"))
    if tag:
        query = query.filter(Contact.tag.ilike(f"%{tag}%"))

    results = []
    for contact, profile in query.all():
        results.append({
            "id": str(contact.id),
            "display_name": profile.display_name,
            "company": profile.company,
            "job_title": profile.job_title,
            "tag": contact.tag,
        })
    return results
