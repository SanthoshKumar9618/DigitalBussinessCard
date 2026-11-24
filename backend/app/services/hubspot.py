"""HubSpot CRM sync using a Private App access token (scope: crm.objects.contacts.write).

Contacts are upserted by email, so syncing twice never creates duplicates.
"""
import json
import logging
import urllib.error
import urllib.request

logger = logging.getLogger(__name__)

API = "https://api.hubapi.com"
BATCH = 100


class HubSpotError(Exception):
    pass


def _request(token: str, method: str, path: str, body: dict | None = None) -> dict:
    req = urllib.request.Request(
        API + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        if e.code == 401:
            raise HubSpotError("HubSpot rejected the token. Reconnect with a valid Private App token.")
        if e.code == 403:
            raise HubSpotError("The HubSpot token is missing the crm.objects.contacts.write scope.")
        if e.code == 429:
            raise HubSpotError("HubSpot rate limit reached. Try again in a minute.")
        detail = e.read()[:300].decode(errors="ignore")
        raise HubSpotError(f"HubSpot error {e.code}: {detail}")
    except urllib.error.URLError as e:
        raise HubSpotError(f"Couldn't reach HubSpot: {e.reason}")


def verify_token(token: str) -> None:
    _request(token, "GET", "/crm/v3/objects/contacts?limit=1")


def _split_name(name: str | None) -> tuple[str, str]:
    parts = (name or "").strip().split()
    if len(parts) <= 1:
        return (parts[0] if parts else ""), ""
    return " ".join(parts[:-1]), parts[-1]


def to_properties(record: dict) -> dict:
    first, last = _split_name(record.get("name"))
    props = {
        "email": record.get("email"),
        "firstname": first,
        "lastname": last,
        "company": record.get("company"),
        "jobtitle": record.get("job_title"),
        "phone": record.get("phone"),
        "website": record.get("website"),
    }
    return {k: str(v)[:255] for k, v in props.items() if v}


def upsert_contacts(token: str, records: list[dict]) -> int:
    """Create or update HubSpot contacts by email. Records without an email are skipped."""
    inputs, seen = [], set()
    for r in records:
        email = (r.get("email") or "").strip().lower()
        if not email or email in seen:
            continue
        seen.add(email)
        inputs.append({"idProperty": "email", "id": email, "properties": to_properties({**r, "email": email})})
    for i in range(0, len(inputs), BATCH):
        _request(token, "POST", "/crm/v3/objects/contacts/batch/upsert", {"inputs": inputs[i:i + BATCH]})
    return len(inputs)
