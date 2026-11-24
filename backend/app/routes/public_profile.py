"""Public (no-login) endpoints: what a person sees after scanning a card."""
import io
import os
import re
from html import escape
from urllib.parse import quote

import qrcode

from fastapi import APIRouter, Depends, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse, Response, StreamingResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.config.settings import settings
from app.database.connection import get_db
from app.database.models import Lead, Profile, ProfileLink, SlugAlias
from app.services import analytics_service, wallet_service
from app.services.cards import card_email, card_phone
from app.services.visibility import get_visibility
from app.utils import rate_limit
from app.utils.exporters import build_vcard
from app.utils.notification import send_lead_alert

router = APIRouter(prefix="/public", tags=["Public Profile"])

templates = Jinja2Templates(
    directory=os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
)

# Inline SVG icons (constant strings, safe to render unescaped).
_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{}</svg>'
ICONS = {
    "phone": _SVG.format('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>'),
    "whatsapp": _SVG.format('<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z"/>'),
    "email": _SVG.format('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>'),
    "web": _SVG.format('<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>'),
    "linkedin": _SVG.format('<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>'),
    "twitter": _SVG.format('<path d="M4 4l16 16M20 4 4 20"/>'),
    "link": _SVG.format('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'),
    "facebook": _SVG.format('<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>'),
}

LEAD_ERRORS = {
    "rate": "Too many submissions. Please try again in a few minutes.",
    "name": "Please enter your name.",
    "contact": "Please add an email or phone number so they can reach you.",
    "email": "That email address doesn't look right.",
}

SOCIAL_BASES = {
    "linkedin": "https://www.linkedin.com/in/",
    "twitter": "https://x.com/",
    "facebook": "https://www.facebook.com/",
}


# ---------------------------------------------------------------- helpers
class _Moved(Exception):
    def __init__(self, slug: str):
        self.slug = slug


def _get_public_profile(db: Session, slug: str, follow_alias: bool = True):
    """Find a public profile by slug. Old slugs (after a rename) resolve to the
    profile; with follow_alias=False they raise _Moved so HTML routes can redirect."""
    profile = db.query(Profile).filter(Profile.slug == slug).first()
    if not profile:
        alias = db.get(SlugAlias, slug)
        if alias:
            if not follow_alias:
                target = db.get(Profile, alias.profile_id)
                if target:
                    raise _Moved(target.slug)
            profile = db.get(Profile, alias.profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    vis = get_visibility(db, profile.user_id)
    if not vis.public_profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile, vis


def _absolute(url: str | None) -> str | None:
    if not url:
        return None
    if url.startswith(("http://", "https://")):
        return url
    return f"{settings.APP_DOMAIN.rstrip('/')}{url}"


def _safe_http(url: str | None) -> str | None:
    """Only allow http(s) links on the page (blocks javascript: etc.)."""
    if url and url.strip().lower().startswith(("http://", "https://")):
        return url.strip()
    return None


def _social_url(kind: str, value: str | None) -> str | None:
    if not value or not value.strip():
        return None
    v = value.strip()
    if v.lower().startswith(("http://", "https://")):
        return _safe_http(v)
    handle = v.lstrip("@").strip("/")
    if not re.fullmatch(r"[A-Za-z0-9._\-]{1,100}", handle):
        return None
    return SOCIAL_BASES[kind] + handle


def _digits(phone: str | None) -> str:
    return re.sub(r"\D", "", phone or "")


def _public_payload(profile: Profile, vis) -> dict:
    return {
        "id": profile.id,
        "slug": profile.slug,
        "display_name": profile.display_name,
        "job_title": profile.job_title,
        "company": profile.company,
        "bio": profile.bio,
        "avatar_url": profile.avatar_url,
        "website": profile.website,
        "linkedin": profile.linkedin,
        "twitter": profile.twitter,
        "facebook": profile.facebook,
        "whatsapp": profile.whatsapp,
        "email": card_email(profile) if vis.show_email else None,
        "phone": card_phone(profile) if vis.show_phone else None,
    }


def _custom_links(db: Session, profile_id) -> list[dict]:
    rows = (
        db.query(ProfileLink)
        .filter(ProfileLink.profile_id == profile_id)
        .order_by(ProfileLink.position, ProfileLink.created_at)
        .all()
    )
    return [{"label": r.label, "url": r.url} for r in rows if _safe_http(r.url)]


def _moved_redirect(request: Request, path_template: str, slug: str) -> RedirectResponse:
    query = f"?{request.url.query}" if request.url.query else ""
    return RedirectResponse(path_template.format(slug=quote(slug)) + query, status_code=301)


# ---------------------------------------------------------------- JSON API
@router.get("/{slug}")
def get_public_profile(slug: str, src: str | None = None, db: Session = Depends(get_db)):
    profile, vis = _get_public_profile(db, slug)
    if src:  # only count views when the caller says where they came from
        analytics_service.log_event(db, profile.id, "profile_view", src)
    return {**_public_payload(profile, vis), "links": _custom_links(db, profile.id)}


# ---------------------------------------------------------------- vCard
@router.get("/{slug}/vcard")
def download_vcard(slug: str, request: Request, src: str | None = None, db: Session = Depends(get_db)):
    try:
        profile, vis = _get_public_profile(db, slug, follow_alias=False)
    except _Moved as m:
        return _moved_redirect(request, "/public/{slug}/vcard", m.slug)
    data = _public_payload(profile, vis)

    vcf = build_vcard(
        name=data["display_name"],
        job_title=data["job_title"],
        company=data["company"],
        email=data["email"],
        phone=data["phone"],
        website=_safe_http(data["website"]),
        note=data["bio"],
        profile_url=settings.public_profile_url(profile.slug),
        photo_url=_absolute(data["avatar_url"]),
        socials={k: _social_url(k, data[k]) for k in SOCIAL_BASES},
    )
    analytics_service.log_event(db, profile.id, "vcard_download", src)

    filename = re.sub(r"[^A-Za-z0-9_-]+", "_", data["display_name"] or "contact").strip("_") or "contact"
    return Response(
        content=vcf,
        media_type="text/vcard; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}.vcf"'},
    )


# ---------------------------------------------------------------- Lead capture
@router.post("/{slug}/lead")
def submit_lead(
    slug: str,
    request: Request,
    name: str = Form(..., max_length=255),
    email: str | None = Form(None, max_length=255),
    phone: str | None = Form(None, max_length=64),
    company: str | None = Form(None, max_length=255),
    note: str | None = Form(None, max_length=500),
    src: str | None = Form(None, max_length=20),
    website_url: str | None = Form(None),  # honeypot: humans leave it empty
    db: Session = Depends(get_db),
):
    profile, _ = _get_public_profile(db, slug)
    source = analytics_service.normalize_source(src)
    back = f"/public/view/{quote(profile.slug)}?src={source}"
    wants_json = "application/json" in request.headers.get("accept", "")

    def fail(key: str, code: int = 400):
        if wants_json:
            raise HTTPException(status_code=code, detail=LEAD_ERRORS[key])
        return RedirectResponse(f"{back}&error={key}#exchange", status_code=303)

    # Bots fill hidden fields: pretend success, store nothing.
    if website_url:
        return {"ok": True} if wants_json else RedirectResponse(f"{back}&sent=1#exchange", status_code=303)

    try:
        rate_limit.check(f"lead:{rate_limit.client_ip(request)}", limit=5, window_seconds=600)
    except HTTPException:
        return fail("rate", 429)

    clean = lambda v: (v or "").strip() or None  # noqa: E731
    name, email, phone, company, note = map(clean, (name, email, phone, company, note))
    if not name:
        return fail("name")
    if not email and not phone:
        return fail("contact")
    if email and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return fail("email")

    db.add(Lead(
        profile_id=profile.id, name=name, email=email, phone=phone,
        company=company, note=note, source=source,
    ))
    analytics_service.log_event(db, profile.id, "lead_submitted", source, commit=False)
    db.commit()

    owner = profile.user
    if owner and owner.email and owner.email_verified:
        send_lead_alert(
            owner.email,
            profile.display_name or owner.name,
            {"name": name, "email": email, "phone": phone, "company": company, "note": note},
        )

    if wants_json:
        return {"ok": True}
    return RedirectResponse(f"{back}&sent=1#exchange", status_code=303)


# ---------------------------------------------------------------- HTML page
@router.get("/view/{slug}", response_class=HTMLResponse)
def public_view(
    slug: str,
    request: Request,
    src: str | None = None,
    sent: int = 0,
    error: str | None = None,
    db: Session = Depends(get_db),
):
    """Landing page people see after scanning a QR / tapping NFC / opening a link."""
    try:
        profile, vis = _get_public_profile(db, slug, follow_alias=False)
    except _Moved as m:
        return _moved_redirect(request, "/public/view/{slug}", m.slug)
    data = _public_payload(profile, vis)
    source = analytics_service.normalize_source(src)

    if not sent and not error:  # don't double-count the redirect after a form post
        analytics_service.log_event(db, profile.id, "profile_view", source)

    quick = []
    if data["phone"]:
        quick.append({"href": f"tel:{_digits(data['phone']) or data['phone']}", "label": "Call", "icon": ICONS["phone"], "external": False})
    wa = _digits(data["whatsapp"])
    if wa:
        quick.append({"href": f"https://wa.me/{wa}", "label": "WhatsApp", "icon": ICONS["whatsapp"], "external": True})
    if data["email"]:
        quick.append({"href": f"mailto:{data['email']}", "label": "Email", "icon": ICONS["email"], "external": False})
    website = _safe_http(data["website"])
    if website:
        quick.append({"href": website, "label": "Website", "icon": ICONS["web"], "external": True})

    links = []
    for kind, label in (("linkedin", "LinkedIn"), ("twitter", "X / Twitter"), ("facebook", "Facebook")):
        url = _social_url(kind, data[kind])
        if url:
            links.append({"href": url, "label": label, "icon": ICONS[kind]})

    for link in _custom_links(db, profile.id):
        links.append({"href": link["url"], "label": link["label"], "icon": ICONS["link"]})

    name = data["display_name"] or "Contact"
    initials = "".join(w[0] for w in name.split()[:2]).upper() or "?"
    subtitle = " · ".join(x for x in (data["job_title"], data["company"]) if x)
    q_src = f"?src={source}"

    return templates.TemplateResponse(
        request,
        "public_profile.html",
        {
            "p": profile,
            "avatar": _absolute(data["avatar_url"]),
            "initials": initials,
            "first_name": name.split()[0],
            "subtitle": subtitle,
            "quick": quick,
            "links": links,
            "vcard_url": f"/public/{quote(profile.slug)}/vcard{q_src}",
            "lead_url": f"/public/{quote(profile.slug)}/lead",
            "src": source,
            "sent": bool(sent),
            "error": LEAD_ERRORS.get(error or ""),
            "home_url": settings.APP_DOMAIN,
            "wallet_apple_url": f"/public/{quote(profile.slug)}/wallet/apple" if wallet_service.apple_enabled() else None,
            "wallet_google_url": f"/public/{quote(profile.slug)}/wallet/google" if wallet_service.google_enabled() else None,
        },
    )


# ---------------------------------------------------------------- QR image
@router.get("/{slug}/qr.png")
def public_qr(slug: str, src: str = "qr", size: int = 8, db: Session = Depends(get_db)):
    """PNG QR code of the profile URL (used in email signatures, print, etc.)."""
    profile, _ = _get_public_profile(db, slug)
    url = f"{settings.public_profile_url(profile.slug)}?src={analytics_service.normalize_source(src)}"
    qr = qrcode.QRCode(border=2, box_size=max(2, min(size, 16)))
    qr.add_data(url)
    qr.make(fit=True)
    buf = io.BytesIO()
    qr.make_image(fill_color="black", back_color="white").save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png", headers={"Cache-Control": "public, max-age=86400"})


# ---------------------------------------------------------------- Email signature
def build_signature_html(profile: Profile, data: dict) -> str:
    """Email-client-safe signature: tables + inline styles, every value escaped."""
    e = lambda v: escape(str(v), quote=True)  # noqa: E731
    base = settings.APP_DOMAIN.rstrip("/")
    card_url = f"{settings.public_profile_url(profile.slug)}?src=email"
    qr_url = f"{base}/public/{quote(profile.slug)}/qr.png?src=email&size=4"
    avatar = _absolute(data["avatar_url"])
    subtitle = " · ".join(x for x in (data["job_title"], data["company"]) if x)

    contact_bits = []
    if data["phone"]:
        contact_bits.append(f'<a href="tel:{e(_digits(data["phone"]) or data["phone"])}" style="color:#374151;text-decoration:none">{e(data["phone"])}</a>')
    if data["email"]:
        contact_bits.append(f'<a href="mailto:{e(data["email"])}" style="color:#374151;text-decoration:none">{e(data["email"])}</a>')
    website = _safe_http(data["website"])
    if website:
        shown = re.sub(r"^https?://(www\.)?", "", website).rstrip("/")
        contact_bits.append(f'<a href="{e(website)}" style="color:#374151;text-decoration:none">{e(shown)}</a>')

    avatar_cell = (
        f'<td style="padding-right:14px;vertical-align:top"><img src="{e(avatar)}" width="64" height="64" alt="" '
        f'style="display:block;width:64px;height:64px;border-radius:32px;object-fit:cover"></td>'
        if avatar else ""
    )
    return (
        '<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#111827;line-height:1.45">'
        "<tr>"
        f"{avatar_cell}"
        '<td style="vertical-align:top;padding-right:16px;border-right:2px solid #B08A35">'
        f'<div style="font-size:16px;font-weight:bold;color:#111827">{e(data["display_name"])}</div>'
        + (f'<div style="color:#6B7280">{e(subtitle)}</div>' if subtitle else "")
        + (f'<div style="margin-top:6px">{" &nbsp;·&nbsp; ".join(contact_bits)}</div>' if contact_bits else "")
        + f'<div style="margin-top:8px"><a href="{e(card_url)}" style="color:#B08A35;font-weight:bold;text-decoration:none">Save my contact →</a></div>'
        "</td>"
        f'<td style="vertical-align:top;padding-left:16px"><a href="{e(card_url)}"><img src="{e(qr_url)}" width="72" height="72" alt="QR code to my contact card" style="display:block;width:72px;height:72px"></a></td>'
        "</tr></table>"
    )


@router.get("/{slug}/signature", response_class=HTMLResponse)
def email_signature(slug: str, request: Request, db: Session = Depends(get_db)):
    try:
        profile, vis = _get_public_profile(db, slug, follow_alias=False)
    except _Moved as m:
        return _moved_redirect(request, "/public/{slug}/signature", m.slug)
    data = _public_payload(profile, vis)
    return templates.TemplateResponse(
        request,
        "signature.html",
        {"name": data["display_name"], "signature_html": build_signature_html(profile, data)},
    )


# ---------------------------------------------------------------- Wallet passes
@router.get("/{slug}/wallet/apple")
def apple_wallet_pass(slug: str, db: Session = Depends(get_db)):
    if not wallet_service.apple_enabled():
        raise HTTPException(status_code=503, detail="Apple Wallet is not configured on this server")
    profile, vis = _get_public_profile(db, slug)
    data = _public_payload(profile, vis)
    blob = wallet_service.build_pkpass(profile, data, settings.public_profile_url(profile.slug))
    analytics_service.log_event(db, profile.id, "wallet_added", "wallet")
    return Response(
        blob,
        media_type="application/vnd.apple.pkpass",
        headers={"Content-Disposition": f'attachment; filename="{profile.slug}.pkpass"'},
    )


@router.get("/{slug}/wallet/google")
def google_wallet_pass(slug: str, db: Session = Depends(get_db)):
    if not wallet_service.google_enabled():
        raise HTTPException(status_code=503, detail="Google Wallet is not configured on this server")
    profile, vis = _get_public_profile(db, slug)
    data = _public_payload(profile, vis)
    url = wallet_service.google_save_url(
        profile, data, settings.public_profile_url(profile.slug), _absolute(data["avatar_url"])
    )
    analytics_service.log_event(db, profile.id, "wallet_added", "wallet")
    return RedirectResponse(url, status_code=302)
