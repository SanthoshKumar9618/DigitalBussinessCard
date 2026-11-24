"""Apple Wallet (.pkpass) and Google Wallet ("Save to Google Wallet" link).

Both only contain information that is already public on the profile page.

Apple needs (from developer.apple.com → Certificates, IDs & Profiles):
  APPLE_PASS_TYPE_ID      e.g. pass.com.yourco.smartcard
  APPLE_TEAM_ID           10-character team id
  APPLE_PASS_CERT_PATH    Pass Type ID certificate (PEM)
  APPLE_PASS_KEY_PATH     its private key (PEM) [+ APPLE_PASS_KEY_PASSWORD]
  APPLE_WWDR_CERT_PATH    Apple WWDR intermediate certificate G4 (PEM)

Google needs (from pay.google.com/business/console + Google Cloud):
  GOOGLE_WALLET_ISSUER_ID     numeric issuer id
  GOOGLE_WALLET_SA_KEY_PATH   service-account JSON key with Wallet API access
"""
import hashlib
import io
import json
import os
import zipfile
from functools import lru_cache

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.serialization import pkcs7
from jose import jwt
from PIL import Image, ImageDraw

from app.config.settings import settings

BRAND_BG = (11, 11, 11)
BRAND_GOLD = (201, 162, 77)


# ---------------------------------------------------------------- config checks
def apple_enabled() -> bool:
    s = settings
    paths = (s.APPLE_PASS_CERT_PATH, s.APPLE_PASS_KEY_PATH, s.APPLE_WWDR_CERT_PATH)
    return bool(s.APPLE_PASS_TYPE_ID and s.APPLE_TEAM_ID and all(p and os.path.exists(p) for p in paths))


def google_enabled() -> bool:
    p = settings.GOOGLE_WALLET_SA_KEY_PATH
    return bool(settings.GOOGLE_WALLET_ISSUER_ID and p and os.path.exists(p))


# ---------------------------------------------------------------- shared
def _card_fields(data: dict) -> dict:
    return {
        "name": data["display_name"] or "Contact",
        "title": data.get("job_title") or "",
        "company": data.get("company") or "",
        "phone": data.get("phone") or "",
        "email": data.get("email") or "",
        "website": data.get("website") or "",
    }


def _icon_png(size: int, text: str = "S") -> bytes:
    """Simple brand mark: gold circle with a letter on near-black."""
    img = Image.new("RGBA", (size, size), BRAND_BG + (255,))
    d = ImageDraw.Draw(img)
    pad = max(1, size // 10)
    d.ellipse((pad, pad, size - pad, size - pad), fill=BRAND_GOLD + (255,))
    try:
        d.text((size / 2, size / 2), text, fill=BRAND_BG + (255,), anchor="mm")
    except Exception:
        pass
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return buf.getvalue()


def _thumbnail(avatar_path: str | None) -> bytes | None:
    """Use the uploaded avatar (local file) as the pass thumbnail, if present."""
    if not avatar_path or avatar_path.startswith("http"):
        return None
    local = os.path.join("uploads", "avatars", os.path.basename(avatar_path))
    if not os.path.exists(local):
        return None
    with Image.open(local) as im:
        im = im.convert("RGB")
        im.thumbnail((180, 180))
        buf = io.BytesIO()
        im.save(buf, "PNG")
        return buf.getvalue()


# ---------------------------------------------------------------- Apple
@lru_cache(maxsize=1)
def _apple_signing_material():
    s = settings
    with open(s.APPLE_PASS_CERT_PATH, "rb") as f:
        cert = x509.load_pem_x509_certificate(f.read())
    with open(s.APPLE_PASS_KEY_PATH, "rb") as f:
        key = serialization.load_pem_private_key(
            f.read(), password=s.APPLE_PASS_KEY_PASSWORD.encode() if s.APPLE_PASS_KEY_PASSWORD else None
        )
    with open(s.APPLE_WWDR_CERT_PATH, "rb") as f:
        wwdr = x509.load_pem_x509_certificate(f.read())
    return cert, key, wwdr


def build_pkpass(profile, data: dict, profile_url: str) -> bytes:
    c = _card_fields(data)
    back = [{"key": "url", "label": "Digital card", "value": profile_url}]
    for key, label in (("phone", "Phone"), ("email", "Email"), ("website", "Website")):
        if c[key]:
            back.append({"key": key, "label": label, "value": c[key]})

    pass_json = {
        "formatVersion": 1,
        "passTypeIdentifier": settings.APPLE_PASS_TYPE_ID,
        "teamIdentifier": settings.APPLE_TEAM_ID,
        "serialNumber": str(profile.id),
        "organizationName": "SmartCard",
        "description": f"Business card of {c['name']}",
        "logoText": "SmartCard",
        "foregroundColor": "rgb(255, 255, 255)",
        "backgroundColor": "rgb(11, 11, 11)",
        "labelColor": "rgb(201, 162, 77)",
        "generic": {
            "primaryFields": [{"key": "name", "value": c["name"]}],
            "secondaryFields": [f for f in ({"key": "title", "label": "TITLE", "value": c["title"]},) if f["value"]],
            "auxiliaryFields": [f for f in ({"key": "company", "label": "COMPANY", "value": c["company"]},) if f["value"]],
            "backFields": back,
        },
        "barcodes": [{
            "format": "PKBarcodeFormatQR",
            "message": f"{profile_url}?src=wallet",
            "messageEncoding": "iso-8859-1",
            "altText": "Scan to save my contact",
        }],
    }

    files: dict[str, bytes] = {
        "pass.json": json.dumps(pass_json, ensure_ascii=False).encode("utf-8"),
        "icon.png": _icon_png(29),
        "icon@2x.png": _icon_png(58),
        "icon@3x.png": _icon_png(87),
        "logo.png": _icon_png(50),
        "logo@2x.png": _icon_png(100),
    }
    thumb = _thumbnail(data.get("avatar_url"))
    if thumb:
        files["thumbnail.png"] = thumb
        files["thumbnail@2x.png"] = thumb

    manifest = json.dumps({n: hashlib.sha1(b).hexdigest() for n, b in files.items()}).encode()
    cert, key, wwdr = _apple_signing_material()
    signature = (
        pkcs7.PKCS7SignatureBuilder()
        .set_data(manifest)
        .add_signer(cert, key, hashes.SHA256())
        .add_certificate(wwdr)
        .sign(serialization.Encoding.DER, [pkcs7.PKCS7Options.DetachedSignature, pkcs7.PKCS7Options.Binary])
    )

    out = io.BytesIO()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for name, blob in files.items():
            z.writestr(name, blob)
        z.writestr("manifest.json", manifest)
        z.writestr("signature", signature)
    return out.getvalue()


# ---------------------------------------------------------------- Google
@lru_cache(maxsize=1)
def _google_sa() -> dict:
    with open(settings.GOOGLE_WALLET_SA_KEY_PATH, encoding="utf-8") as f:
        return json.load(f)


def google_save_url(profile, data: dict, profile_url: str, avatar_abs: str | None) -> str:
    sa = _google_sa()
    issuer = settings.GOOGLE_WALLET_ISSUER_ID
    c = _card_fields(data)
    class_id = f"{issuer}.smartcard_business_card"
    object_id = f"{issuer}.{profile.id.hex}"

    text_modules = [
        {"id": key, "header": label, "body": c[key]}
        for key, label in (("phone", "Phone"), ("email", "Email"), ("website", "Website"))
        if c[key]
    ]
    obj = {
        "id": object_id,
        "classId": class_id,
        "state": "ACTIVE",
        "hexBackgroundColor": "#0B0B0B",
        "cardTitle": {"defaultValue": {"language": "en", "value": "SmartCard"}},
        "header": {"defaultValue": {"language": "en", "value": c["name"]}},
        "barcode": {"type": "QR_CODE", "value": f"{profile_url}?src=wallet", "alternateText": "Scan to save my contact"},
        "linksModuleData": {"uris": [{"uri": profile_url, "description": "Open digital card", "id": "card"}]},
    }
    sub = " · ".join(x for x in (c["title"], c["company"]) if x)
    if sub:
        obj["subheader"] = {"defaultValue": {"language": "en", "value": sub}}
    if text_modules:
        obj["textModulesData"] = text_modules
    if avatar_abs and avatar_abs.startswith("https://"):
        obj["logo"] = {"sourceUri": {"uri": avatar_abs}}

    claims = {
        "iss": sa["client_email"],
        "aud": "google",
        "typ": "savetowallet",
        "origins": [settings.APP_DOMAIN],
        "payload": {"genericClasses": [{"id": class_id}], "genericObjects": [obj]},
    }
    token = jwt.encode(claims, sa["private_key"], algorithm="RS256")
    return f"https://pay.google.com/gp/v/save/{token}"
