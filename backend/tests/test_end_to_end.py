"""End-to-end API scenario: auth, profiles, contacts, cards, leads, insights,
custom links, wallet passes, email, AI (faked), webhooks, HubSpot (faked) and teams.

Runs against an in-memory SQLite database; no external service is contacted
(Claude, Resend, HubSpot and webhook endpoints are replaced with fakes).

    cd backend && pytest -q
"""
# flake8: noqa


def test_end_to_end(capsys):
    import os, io, logging, re
    os.environ.update(ENVIRONMENT="development", JWT_SECRET="test-secret")
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import StaticPool
    from app.database.connection import Base, get_db
    import app.database.models as m
    from app.main import app
    from fastapi.testclient import TestClient

    eng = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(eng)
    S = sessionmaker(bind=eng)
    def _db():
        d = S()
        try: yield d
        finally: d.close()
    app.dependency_overrides[get_db] = _db

    captured = []
    class H(logging.Handler):
        def emit(self, r): captured.append(r.getMessage())
    logging.getLogger().addHandler(H()); logging.getLogger().setLevel(logging.INFO)
    def last_otp():
        for msg in reversed(captured):
            mm = re.search(r"code is (\d{6})", msg)
            if mm: return mm.group(1)

    c = TestClient(app)
    failures = []


    def ok(cond, label):
        print(("PASS " if cond else "FAIL ") + label)
        if not cond:
            failures.append(label)

    r = c.post("/auth/register", json=dict(name="Alice A", phone="111", email="a@x.com", password="pw123456", confirm_password="pw123456"))
    uid = r.json()["user_id"]; ok(r.status_code == 201, "register")
    ok(c.post("/auth/login", json=dict(identifier="a@x.com", password="wrong")).status_code == 401, "B1 wrong pw -> 401 (not 500)")
    ok(c.post("/auth/login", json=dict(identifier="a@x.com", password="pw123456")).status_code == 403, "unverified + right pw -> 403")
    ok(c.post("/auth/resend-email-otp", json=dict(user_id=uid)).status_code == 200, "B16 resend OTP with JSON body")
    for i in range(5):
        c.post("/auth/verify-email", json=dict(user_id=uid, otp="000000"))
    otp_after_burn = last_otp()
    ok(c.post("/auth/verify-email", json=dict(user_id=uid, otp=otp_after_burn)).status_code == 400, "S4 OTP burned after 5 wrong tries")
    c.post("/auth/resend-email-otp", json=dict(user_id=uid))
    r = c.post("/auth/verify-email", json=dict(user_id=uid, otp=last_otp()))
    ok(r.status_code == 200 and r.json()["access_token"], "verify email -> tokens")
    A = {"Authorization": "Bearer " + r.json()["access_token"]}
    refresh = r.json()["refresh_token"]
    ok(c.post("/auth/refresh", json=dict(refresh_token=refresh)).status_code == 200, "S13 refresh via body")
    ok(c.get("/profile-card/card", headers=A).status_code == 404, "B5 card w/o profile -> 404")
    p = c.post("/profile/", headers=A, json=dict(company="Acme", website="https://acme.io")).json()
    ok(c.get("/profile-card/card", headers=A).status_code == 200, "card with profile")

    # second user
    r = c.post("/auth/register", json=dict(name="Bob <script>", phone="222", email="b@x.com", password="pw123456", confirm_password="pw123456"))
    buid = r.json()["user_id"]
    B = {"Authorization": "Bearer " + c.post("/auth/verify-email", json=dict(user_id=buid, otp=last_otp())).json()["access_token"]}
    bp = c.post("/profile/", headers=B, json={}).json()

    ok(c.post("/nfc/assign", headers=B, json=dict(uid="TAG1", profile_id=p["id"])).status_code == 403, "S7 can't bind tag to others' profile")
    ok(c.post("/nfc/assign", headers=A, json=dict(uid="TAG1", profile_id=p["id"])).status_code == 200, "bind own tag")
    ok(c.post("/nfc/assign", headers=A, json=dict(uid="TAG1", profile_id=p["id"])).status_code == 200, "re-bind same tag (no 500)")
    ok(c.post("/nfc/assign", headers=B, json=dict(uid="TAG1", profile_id=bp["id"])).status_code == 409, "steal tag -> 409")
    ok(c.get("/nfc/resolve/TAG1").status_code == 200, "resolve tag")

    html = c.get(f"/public/view/{bp['slug']}").text
    ok("<script>" not in html and "&lt;script&gt;" in html, "S8 public view escaped")

    # contacts + privacy
    r = c.post("/contacts/", headers=B, json=dict(target_profile_id=p["id"]))
    ok(r.status_code == 201 and r.json()["saved_email"] is None and r.json()["saved_phone"] is None, "S9 snapshot hides email/phone by default")
    cid = r.json()["id"]
    ok(c.get(f"/contacts/{cid}", headers=B).status_code == 200, "B10 GET /contacts/{id}")
    ok(c.get(f"/contacts/{cid}", headers=A).status_code == 404, "other user's contact -> 404")
    ok(c.post("/contacts/", headers=B, json=dict(target_profile_id="00000000-0000-4000-8000-000000000000")).status_code == 404, "B4 missing profile -> 404")
    c.put("/settings/", headers=A, json=dict(show_phone=True))
    ok(c.get(f"/contacts/{cid}", headers=B).json()["saved_phone"] == "111", "show_phone=True -> phone visible")
    c.put("/settings/", headers=A, json=dict(public_profile=False))
    ok(c.get(f"/public/{p['slug']}").status_code == 404, "S9 private profile hidden from /public")
    ok(c.get("/nfc/resolve/TAG1").status_code == 404, "S9 private profile hidden from NFC")

    # email change
    ok(c.post("/user/email/send-otp", headers=A, json=dict(email="b@x.com")).status_code == 400, "email change to taken email blocked")
    c.post("/user/email/send-otp", headers=A, json=dict(email="new@x.com"))
    code = last_otp()
    ok(c.get("/profile/me", headers=A).json()["email"] == "a@x.com", "S6 email unchanged before verify")
    ok(c.post("/user/email/verify-otp", headers=A, json=dict(email="other@x.com", otp=code)).status_code == 400, "S6 OTP bound to the requested email")
    ok(c.post("/user/email/verify-otp", headers=A, json=dict(email="new@x.com", otp=code)).status_code == 200, "email change verified")
    ok(c.get("/profile/me", headers=A).json()["email"] == "new@x.com", "email changed after verify")
    ok(c.put("/user", headers=A, json=dict(phone="222")).status_code == 400, "B12 duplicate phone -> 400")

    # forgot / reset
    ok(c.post("/auth/forgot-password", json=dict(identifier="nobody@x.com")).status_code == 200, "S12 forgot-pw no enumeration")
    c.post("/auth/forgot-password", json=dict(identifier="new@x.com"))
    ok(c.post("/auth/reset-password", json=dict(identifier="new@x.com", otp=last_otp(), password="newpass1", confirm_password="newpass1")).status_code == 200, "S5 reset with hashed OTP")
    ok(c.post("/auth/login", json=dict(identifier="new@x.com", password="newpass1")).status_code == 200, "login with new password")

    # avatar
    fake = c.post("/profile/avatar", headers=A, files={"file": ("x.png", b"not an image", "image/png")})
    ok(fake.status_code == 400, "S11 non-image rejected")
    from PIL import Image
    buf = io.BytesIO(); Image.new("RGB", (4, 4)).save(buf, "PNG")
    up = c.post("/profile/avatar", headers=A, files={"file": ("x.png", buf.getvalue(), "image/png")})
    ok(up.status_code == 200, "real image accepted")
    c.delete("/profile/avatar", headers=A)
    ok(c.post("/auth/social-login", json=dict(provider="google", token="x")).status_code == 503, "social login unconfigured -> 503")

    prod_leak = [m for m in captured if "SECRET" in m or "TOKEN RECEIVED" in m]
    ok(not prod_leak, "S2 no secret/token in logs")

    print("---- phase 1 features ----")
    c.put("/settings/", headers=A, json=dict(public_profile=True, show_email=True, show_phone=True))
    c.put("/profile/", headers=A, json=dict(display_name="Alice Ann", job_title="CTO", linkedin="alice-a", twitter="javascript:alert(1)", whatsapp="+91 98765 43210", bio="Hi;there,\nnew line"))
    slug = p["slug"]
    page = c.get(f"/public/view/{slug}?src=qr")
    ok(page.status_code == 200 and "Save contact" in page.text and "Share my details" in page.text, "public page renders")
    ok("linkedin.com/in/alice-a" in page.text and "javascript:" not in page.text, "social links built, unsafe dropped")
    ok("wa.me/919876543210" in page.text, "whatsapp link digits")
    v = c.get(f"/public/{slug}/vcard?src=qr")
    ok(v.status_code == 200 and v.headers["content-type"].startswith("text/vcard") and "FN:Alice Ann" in v.text and r"NOTE:Hi\;there\,\nnew line" in v.text, "vCard download + escaping")
    ok("EMAIL;TYPE=INTERNET:new@x.com" in v.text, "vCard honours show_email")
    r = c.post(f"/public/{slug}/lead", data=dict(name="Visitor", email="v@y.com", note="=cmd()", src="qr"), follow_redirects=False)
    ok(r.status_code == 303 and "sent=1" in r.headers["location"], "lead form post -> PRG redirect")
    ok(c.post(f"/public/{slug}/lead", data=dict(name="NoContact"), follow_redirects=False).headers["location"].find("error=contact") > 0, "lead needs email or phone")
    ok(c.post(f"/public/{slug}/lead", data=dict(name="Bot", email="b@b.co", website_url="spam"), follow_redirects=False).status_code == 303, "honeypot silently accepted")
    err = c.get(f"/public/view/{slug}?error=<b>evil</b>").text
    ok("evil" not in err, "error param not echoed")
    leads = c.get("/leads", headers=A).json()
    ok(len(leads) == 1 and leads[0]["name"] == "Visitor" and not leads[0]["is_read"], "lead in inbox (bot dropped)")
    ok(c.get("/leads", headers=B).json() == [], "other user can't see leads")
    lid = leads[0]["id"]
    ok(c.patch(f"/leads/{lid}", headers=B, json=dict(is_read=True)).status_code == 404, "can't update others' lead")
    ok(c.patch(f"/leads/{lid}", headers=A, json=dict(is_read=True)).json()["is_read"], "mark lead read")
    csv_leads = c.get("/leads/export.csv", headers=A).text
    ok("'=cmd()" in csv_leads, "CSV formula injection neutralised")
    c.get(f"/public/{slug}?src=nfc")
    s = c.get("/analytics/summary?days=7", headers=A).json()
    ok(s["views"] >= 2 and s["vcard_saves"] == 1 and s["leads"] == 1 and s["connections"] == 1, f"insights counts {s['views']},{s['vcard_saves']},{s['leads']},{s['connections']}")
    ok(s["sources"].get("qr", 0) >= 1 and s["sources"].get("nfc", 0) >= 1 and len(s["daily"]) == 14 and s["daily"][-1]["views"] >= 2, "insights sources + daily chart")
    ok(c.patch(f"/contacts/{cid}", headers=B, json=dict(notes="Met at summit", tag="investor")).json()["notes"] == "Met at summit", "edit contact notes/tag")
    ok(c.patch(f"/contacts/{cid}", headers=A, json=dict(notes="x")).status_code == 404, "can't edit others' contact")
    ok("Met at summit" in c.get("/contacts/export.csv", headers=B).text, "contacts CSV export")
    ok(c.delete(f"/leads/{lid}", headers=A).status_code == 204, "delete lead")
    for i in range(6):
        last = c.post(f"/public/{slug}/lead", data=dict(name="Spam", email="s@s.co"), headers={"accept": "application/json"})
    ok(last.status_code == 429, "lead rate limit")


    print("---- phase 2 features ----")
    # custom slug
    ok(c.get("/profile/slug/check?slug=admin", headers=A).json()["available"] is False, "reserved slug rejected")
    ok(c.get(f"/profile/slug/check?slug={bp['slug']}", headers=A).json()["available"] is False, "taken slug rejected")
    ok(c.get("/profile/slug/check?slug=-bad", headers=A).json()["available"] is False, "invalid slug rejected")
    old_slug = slug
    r = c.put("/profile/slug", headers=A, json=dict(slug="alice-builds"))
    ok(r.status_code == 200 and r.json()["slug"] == "alice-builds", "slug changed")
    red = c.get(f"/public/view/{old_slug}?src=qr", follow_redirects=False)
    ok(red.status_code == 301 and red.headers["location"] == "/public/view/alice-builds?src=qr", "old slug 301 -> new (query kept)")
    ok(c.get(f"/public/{old_slug}").json()["slug"] == "alice-builds", "old slug resolves in JSON API")
    ok(c.get(f"/profile/slug/check?slug={old_slug}", headers=B).json()["available"] is False, "old slug can't be taken by others")
    ok(c.put("/profile/slug", headers=A, json=dict(slug=old_slug)).status_code == 200, "owner can take back old slug")
    c.put("/profile/slug", headers=A, json=dict(slug="alice-builds"))
    slug = "alice-builds"
    ok("alice-builds?src=nfc" in c.post("/nfc/assign", headers=A, json=dict(uid="TAG9", profile_id=p["id"])).json()["public_url"], "NFC url uses new slug")

    # custom links
    ok(c.post("/profile/links", headers=A, json=dict(label="Portfolio", url="javascript:alert(1)")).status_code == 422, "unsafe link rejected")
    l1 = c.post("/profile/links", headers=A, json=dict(label="Portfolio", url="alice.dev")).json()
    ok(l1["url"] == "https://alice.dev", "link gets https://")
    l2 = c.post("/profile/links", headers=A, json=dict(label="Calendar", url="https://cal.com/alice")).json()
    ok([x["label"] for x in c.put("/profile/links/order", headers=A, json=dict(ids=[l2["id"], l1["id"]])).json()] == ["Calendar", "Portfolio"], "reorder links")
    ok(c.put(f"/profile/links/{l1['id']}", headers=B, json=dict(label="x", url="https://x.io")).status_code == 404, "can't edit others' link")
    pg = c.get(f"/public/view/{slug}").text
    ok(pg.index("Calendar") < pg.index("Portfolio") and "https://alice.dev" in pg, "custom links on public page in order")
    ok(len(c.get(f"/public/{slug}").json()["links"]) == 2, "custom links in JSON")
    ok(c.delete(f"/profile/links/{l1['id']}", headers=A).status_code == 204, "delete link")

    # signature + QR
    q = c.get(f"/public/{slug}/qr.png?src=email")
    ok(q.status_code == 200 and q.content[:8] == b"\x89PNG\r\n\x1a\n", "public QR png")
    sig = c.get(f"/public/{slug}/signature").text
    ok("Save my contact" in sig and "src=email" in sig and "qr.png" in sig, "signature page")
    c.put("/profile/", headers=A, json=dict(display_name='Alice "<b>" Ann'))
    sig = c.get(f"/public/{slug}/signature").text
    ok("<b>" not in sig.split('id="signature">')[1].split("</table>")[0], "signature escapes values")
    c.put("/profile/", headers=A, json=dict(display_name="Alice Ann"))
    kit = c.get("/profile/share-kit", headers=A).json()
    ok(kit["slug"] == slug and kit["wallet"]["apple_url"] is None, "share kit (wallet off by default)")
    ok(c.get(f"/public/{slug}/wallet/apple").status_code == 503, "apple wallet 503 when unconfigured")

    # wallet with throwaway test credentials
    import datetime, json as _json, zipfile, io as _io, tempfile, hashlib
    from cryptography import x509
    from cryptography.x509.oid import NameOID
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives.serialization import pkcs7 as _p7
    from app.config.settings import settings as SETTINGS
    tmp = tempfile.mkdtemp()


    def mk(cn):
        k = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, cn)])
        now = datetime.datetime.now(datetime.timezone.utc)
        cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(k.public_key())
                .serial_number(1).not_valid_before(now).not_valid_after(now + datetime.timedelta(days=1)).sign(k, hashes.SHA256()))
        return k, cert


    k, cert = mk("pass")
    _, wwdr = mk("wwdr")
    paths = {n: f"{tmp}/{n}.pem" for n in ("cert", "key", "wwdr")}
    open(paths["cert"], "wb").write(cert.public_bytes(serialization.Encoding.PEM))
    open(paths["key"], "wb").write(k.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
    open(paths["wwdr"], "wb").write(wwdr.public_bytes(serialization.Encoding.PEM))
    SETTINGS.APPLE_PASS_TYPE_ID, SETTINGS.APPLE_TEAM_ID = "pass.test.smartcard", "ABCDE12345"
    SETTINGS.APPLE_PASS_CERT_PATH, SETTINGS.APPLE_PASS_KEY_PATH, SETTINGS.APPLE_WWDR_CERT_PATH = paths["cert"], paths["key"], paths["wwdr"]
    pk = c.get(f"/public/{slug}/wallet/apple")
    z = zipfile.ZipFile(_io.BytesIO(pk.content))
    names = set(z.namelist())
    man = _json.loads(z.read("manifest.json"))
    ok(pk.headers["content-type"] == "application/vnd.apple.pkpass" and {"pass.json", "manifest.json", "signature", "icon.png"} <= names, "pkpass structure")
    ok(all(hashlib.sha1(z.read(n)).hexdigest() == h for n, h in man.items()), "pkpass manifest hashes match")
    pj = _json.loads(z.read("pass.json"))
    ok(pj["generic"]["primaryFields"][0]["value"] == "Alice Ann" and "src=wallet" in pj["barcodes"][0]["message"], "pass.json content")
    ok(len(_p7.load_der_pkcs7_certificates(z.read("signature"))) >= 1, "pkpass signature is DER PKCS7")
    ok("Add to Apple Wallet" in c.get(f"/public/view/{slug}").text, "wallet button appears when configured")

    sa = {"client_email": "wallet@test.iam.gserviceaccount.com",
          "private_key": k.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode()}
    open(f"{tmp}/sa.json", "w").write(_json.dumps(sa))
    SETTINGS.GOOGLE_WALLET_ISSUER_ID, SETTINGS.GOOGLE_WALLET_SA_KEY_PATH = "3388000000012345678", f"{tmp}/sa.json"
    gw = c.get(f"/public/{slug}/wallet/google", follow_redirects=False)
    from jose import jwt as _jwt
    tok = gw.headers["location"].rsplit("/", 1)[1]
    pub = cert.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo).decode()
    claims = _jwt.decode(tok, pub, algorithms=["RS256"], audience="google")
    ok(gw.status_code == 302 and claims["typ"] == "savetowallet"
       and claims["payload"]["genericObjects"][0]["header"]["defaultValue"]["value"] == "Alice Ann", "google wallet JWT valid")

    # email: lead alert + OTP via Resend (network mocked, nothing leaves the machine)
    import urllib.request as _ur
    import concurrent.futures as _cf
    from app.utils import notification as N
    sent = []


    class _Resp:
        status = 200

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False


    def _fake_urlopen(req, timeout=0):
        sent.append(_json.loads(req.data))
        return _Resp()


    _orig = _ur.urlopen
    _ur.urlopen = _fake_urlopen
    SETTINGS.EMAIL_PROVIDER, SETTINGS.RESEND_API_KEY = "resend", "re_test"
    c.post(f"/public/{slug}/lead", data=dict(name="Ravi <script>", email="ravi@z.io"),
           headers={"x-forwarded-for": "9.9.9.9"}, follow_redirects=False)
    N._pool.shutdown(wait=True)
    N._pool = _cf.ThreadPoolExecutor(2)
    ok(len(sent) == 1 and sent[0]["to"] == ["new@x.com"] and "Ravi" in sent[0]["subject"], "lead alert email sent via Resend")
    ok("<script>" not in sent[0]["html"], "lead alert escapes input")
    c.post("/auth/forgot-password", json=dict(identifier="new@x.com"))
    N._pool.shutdown(wait=True)
    ok(len(sent) == 2 and "SmartCard code" in sent[1]["subject"], "OTP email via Resend")
    _ur.urlopen = _orig


    print("---- phase 2b: multiple cards ----")
    SETTINGS.EMAIL_PROVIDER = "console"
    cards = c.get("/cards", headers=A).json()
    ok(len(cards) == 1 and cards[0]["is_primary"] and cards[0]["label"] == "Main", "existing profile is the primary 'Main' card")
    primary_id = cards[0]["id"]

    r = c.post("/cards", headers=A, json=dict(label="Personal"))
    ok(r.status_code == 201 and r.json()["label"] == "Personal" and not r.json()["is_primary"], "create second card")
    personal = r.json()
    ok(personal["slug"] != slug and personal["company"] == "Acme", "new card copies content, gets own slug")
    ok(c.post("/cards", headers=A, json=dict(label="personal")).status_code == 400, "duplicate card name rejected")
    blank = c.post("/cards", headers=A, json=dict(label="Side project", blank=True)).json()
    ok(blank["company"] is None and blank["display_name"] == "Alice Ann", "blank card starts empty")

    P = {**A, "X-Card-Id": personal["id"]}
    me = c.get("/profile/me", headers=P).json()
    ok(me["id"] == personal["id"] and me["label"] == "Personal", "X-Card-Id selects the card")
    ok(c.get("/profile/me", headers=A).json()["id"] == primary_id, "no header -> primary card")
    ok(c.get("/profile/me", headers={**B, "X-Card-Id": personal["id"]}).status_code == 404, "can't use someone else's card")
    ok(c.get("/profile/me", headers={**A, "X-Card-Id": "nope"}).status_code == 400, "bad card id -> 400")

    c.put("/profile/", headers=P, json=dict(job_title="Weekend potter", company=""))
    ok(c.get("/profile/me", headers=P).json()["job_title"] == "Weekend potter", "edit applies to active card")
    ok(c.get("/profile/me", headers=A).json()["job_title"] == "CTO", "primary card untouched")

    # per-card contact details
    r = c.patch(f"/cards/{personal['id']}", headers=A, json=dict(contact_email="alice@home.me", contact_phone="+44 7000 000000"))
    ok(r.status_code == 200 and r.json()["email"] == "alice@home.me", "card contact override")
    ok(c.patch(f"/cards/{personal['id']}", headers=A, json=dict(contact_email="not-an-email")).status_code == 422, "bad card email rejected")
    pub = c.get(f"/public/{personal['slug']}").json()
    ok(pub["email"] == "alice@home.me" and pub["phone"] == "+44 7000 000000", "public card uses card contact details")
    ok("EMAIL;TYPE=INTERNET:alice@home.me" in c.get(f"/public/{personal['slug']}/vcard").text, "vCard uses card email")
    ok(c.get(f"/public/{slug}").json()["email"] == "new@x.com", "primary still uses account email")

    # per-card links, insights, leads
    c.post("/profile/links", headers=P, json=dict(label="Pottery shop", url="https://pots.example"))
    ok([l["label"] for l in c.get("/profile/links", headers=P).json()] == ["Pottery shop"], "links are per card")
    ok("Pottery shop" not in [l["label"] for l in c.get("/profile/links", headers=A).json()], "primary links separate")
    c.get(f"/public/view/{personal['slug']}?src=qr")
    c.post(f"/public/{personal['slug']}/lead", data=dict(name="Neighbour", email="n@n.io"), headers={"x-forwarded-for": "7.7.7.7"}, follow_redirects=False)
    ins_p = c.get("/analytics/summary", headers=P).json()
    ok(ins_p["card_label"] == "Personal" and ins_p["views"] == 1 and ins_p["leads"] == 1, "insights per card")
    all_leads = c.get("/leads", headers=A).json()
    ok(any(l["name"] == "Neighbour" and l["card_label"] == "Personal" for l in all_leads), "lead inbox spans cards, tagged")
    ok(c.get("/profile/share-kit", headers=P).json()["slug"] == personal["slug"], "share kit per card")

    # make primary
    r = c.post(f"/cards/{personal['id']}/primary", headers=A)
    ok([x["label"] for x in r.json()][0] == "Personal" and sum(x["is_primary"] for x in r.json()) == 1, "switch primary (exactly one)")
    ok(c.get("/profile/me", headers=A).json()["id"] == personal["id"], "no header now -> new primary")
    ok(c.delete(f"/cards/{personal['id']}", headers=A).status_code == 400, "can't delete primary")
    c.post(f"/cards/{primary_id}/primary", headers=A)

    # delete a card: links redirect, tags move, savers keep contact
    c.post("/nfc/assign", headers=A, json=dict(uid="TAG-P", profile_id=personal["id"]))
    saved = c.post("/contacts/", headers=B, json=dict(target_profile_id=personal["id"])).json()
    ok(c.delete(f"/cards/{personal['id']}", headers={**B}).status_code == 404, "can't delete others' card")
    ok(c.delete(f"/cards/{personal['id']}", headers=A).status_code == 204, "delete card")
    red = c.get(f"/public/view/{personal['slug']}?src=qr", follow_redirects=False)
    ok(red.status_code == 301 and red.headers["location"].startswith(f"/public/view/{slug}"), "deleted card link -> primary")
    ok(c.get("/nfc/resolve/TAG-P").json()["slug"] == slug, "NFC tag moved to primary")
    # B had already saved the primary card, so the duplicate is merged rather than repointed
    ok(c.get(f"/contacts/{saved['id']}", headers=B).status_code == 404
       and [x["target_profile_id"] for x in c.get("/contacts/", headers=B).json()].count(primary_id) == 1, "saver's duplicate merged into primary")
    ok(len(c.get("/cards", headers=A).json()) == 2, "card count after delete")

    # repoint case: a user who saved ONLY the deleted card keeps the contact
    work = c.post("/cards", headers=A, json=dict(label="Consulting")).json()
    r = c.post("/auth/register", json=dict(name="Carol C", phone="333", email="c@x.com", password="pw123456", confirm_password="pw123456"))
    C3 = {"Authorization": "Bearer " + c.post("/auth/verify-email", json=dict(user_id=r.json()["user_id"], otp=last_otp())).json()["access_token"]}
    only = c.post("/contacts/", headers=C3, json=dict(target_profile_id=work["id"])).json()
    c.delete(f"/cards/{work['id']}", headers=A)
    ok(c.get(f"/contacts/{only['id']}", headers=C3).json()["target_profile_id"] == primary_id, "saver keeps contact (repointed)")

    # limits
    for i in range(3):
        c.post("/cards", headers=A, json=dict(label=f"Extra {i}"))
    ok(c.post("/cards", headers=A, json=dict(label="Too many")).status_code == 400, "max 5 cards")
    ok(c.post("/profile/", headers=A, json={}).status_code == 400, "POST /profile still refuses a 2nd profile")


    print("---- phase 3: intelligence ----")
    import types, json as _json3, io as _io3, datetime as _dt3
    from PIL import Image as _Img3
    from app.services import ai_service as AI

    # AI off by default
    ok(c.get("/ai/status", headers=A).json() == {"scan_card": False, "follow_up_drafts": False}, "AI disabled without key")
    buf3 = _io3.BytesIO(); _Img3.new("RGB", (2400, 1400), "white").save(buf3, "JPEG")
    CARD_JPG = buf3.getvalue()
    ok(c.post("/ai/scan-card", headers=A, files={"file": ("c.jpg", CARD_JPG, "image/jpeg")}).status_code == 503, "scan 503 when AI off")

    # ---- fake Claude client (records requests, returns canned JSON) ----
    calls = []
    next_reply = {}


    class _Block:
        def __init__(self, text):
            self.type, self.text = "text", text


    class _Resp:
        def __init__(self, payload, stop="end_turn"):
            self.stop_reason = stop
            self.content = [_Block(_json3.dumps(payload))] if payload is not None else []


    class _FakeMessages:
        def create(self, **kw):
            calls.append(kw)
            r = next_reply.pop("r")
            return r


    fake = types.SimpleNamespace(beta=types.SimpleNamespace(messages=_FakeMessages()))
    SETTINGS.ANTHROPIC_API_KEY = "sk-test"
    AI._get_client = lambda: fake
    ok(c.get("/ai/status", headers=A).json()["scan_card"] is True, "AI enabled with key")

    card_json = {"is_business_card": True, "name": "Ravi Kumar", "job_title": "Head of Sales", "company": "Zen Labs",
                 "email": "ravi@zen.io", "phone": "+91 98450 12345", "website": "zen.io", "linkedin": "", "address": "Indiranagar, Bengaluru",
                 "notes": "", "other_emails": [], "other_phones": ["+91 80 4000 0000"], "confidence": "high"}
    next_reply["r"] = _Resp(card_json)
    r = c.post("/ai/scan-card", headers=A, files={"file": ("c.jpg", CARD_JPG, "image/jpeg")})
    ok(r.status_code == 200 and r.json()["name"] == "Ravi Kumar" and r.json()["other_phones"] == ["+91 80 4000 0000"], "scan returns extracted fields")
    kw = calls[-1]
    img = kw["messages"][0]["content"][0]
    ok(kw["model"] == "claude-opus-5-5" and kw["fallbacks"] == "default" and "server-side-fallback-2026-07-01" in kw["betas"], "request: model + refusal fallbacks")
    ok(kw["output_config"]["format"]["type"] == "json_schema" and kw["output_config"]["effort"] == "low", "request: structured output, low effort")
    sent = _Img3.open(_io3.BytesIO(__import__("base64").b64decode(img["source"]["data"])))
    ok(img["type"] == "image" and max(sent.size) <= 1568, f"image downscaled before sending {sent.size}")

    next_reply["r"] = _Resp({**card_json, "is_business_card": False})
    ok(c.post("/ai/scan-card", headers=A, files={"file": ("c.jpg", CARD_JPG, "image/jpeg")}).status_code == 422, "not a business card -> 422")
    next_reply["r"] = _Resp(None, stop="refusal")
    ok(c.post("/ai/scan-card", headers=A, files={"file": ("c.jpg", CARD_JPG, "image/jpeg")}).status_code == 422, "refusal -> 422")
    ok(c.post("/ai/scan-card", headers=A, files={"file": ("c.jpg", b"not an image", "image/jpeg")}).status_code == 422, "garbage file -> 422")

    # ---- manual contact from the scan ----
    m = c.post("/contacts/manual", headers=A, json=dict(name="Ravi Kumar", job_title="Head of Sales", company="Zen Labs",
              email="ravi@zen.io", phone="+91 98450 12345", address="Indiranagar, Bengaluru", met_at="SaaSBoomi 2026", source="scan"))
    ok(m.status_code == 201 and m.json()["target_profile_id"] is None and m.json()["source"] == "scan", "manual (scanned) contact saved")
    mid = m.json()["id"]
    ok(m.json()["met_on"] == _dt3.date.today().isoformat(), "met_on defaults to today")
    ok(c.post("/contacts/manual", headers=A, json=dict(name="  ")).status_code == 422, "manual contact needs a name")
    lst = c.get("/contacts/", headers=A).json()
    ok(any(x["id"] == mid for x in lst), "manual contact in list (snapshot sync skips it)")
    ok(any(x["id"] == mid for x in c.get("/contacts/search?q=SaaSBoomi", headers=A).json()), "search finds 'met at'")
    ok(c.get(f"/contacts/{mid}", headers=A).json()["saved_address"] == "Indiranagar, Bengaluru", "manual contact detail")

    # ---- follow-up reminders ----
    now = _dt3.datetime.now(_dt3.timezone.utc)
    c.patch(f"/contacts/{mid}", headers=A, json=dict(follow_up_at=(now - _dt3.timedelta(days=2)).isoformat(), notes="Wants API pricing for 50 seats"))
    c.patch(f"/contacts/{cid}", headers=B, json=dict(follow_up_at=(now + _dt3.timedelta(days=3)).isoformat()))
    rem = c.get("/contacts/reminders", headers=A).json()
    ok([x["id"] for x in rem["overdue"]] == [mid] and rem["today"] == [] , "overdue reminder")
    remb = c.get("/contacts/reminders", headers=B).json()
    ok([x["id"] for x in remb["upcoming"]] == [cid], "upcoming reminder (other user isolated)")
    c.patch(f"/contacts/{mid}", headers=A, json=dict(follow_up_done=True))
    ok(c.get("/contacts/reminders", headers=A).json()["overdue"] == [], "done reminder disappears")
    c.patch(f"/contacts/{mid}", headers=A, json=dict(follow_up_at=(now + _dt3.timedelta(hours=1)).isoformat()))
    rem = c.get("/contacts/reminders", headers=A).json()
    ok([x["id"] for x in rem["today"] + rem["upcoming"]] == [mid] and c.get(f"/contacts/{mid}", headers=A).json()["follow_up_done"] is False, "new date re-opens reminder")
    c.patch(f"/contacts/{mid}", headers=A, json=dict(follow_up_at=None))
    ok(c.get(f"/contacts/{mid}", headers=A).json()["follow_up_at"] is None, "clear reminder")

    # ---- AI follow-up draft ----
    next_reply["r"] = _Resp({"subject": "Great meeting at SaaSBoomi", "message": "Hi Ravi, ..."})
    d = c.post(f"/contacts/{mid}/follow-up-draft", headers=A, json=dict(channel="email", goal="book a demo"))
    ok(d.status_code == 200 and d.json()["subject"] == "Great meeting at SaaSBoomi", "email draft")
    prompt = calls[-1]["messages"][0]["content"][0]["text"]
    ok("Wants API pricing for 50 seats" in prompt and "SaaSBoomi 2026" in prompt and "book a demo" in prompt and "Alice Ann" in prompt,
       "draft prompt includes notes, place, goal, sender card")
    ok(calls[-1]["output_config"]["effort"] == "medium", "draft uses medium effort")
    next_reply["r"] = _Resp({"subject": "ignored", "message": "Hey Ravi!"})
    ok(c.post(f"/contacts/{mid}/follow-up-draft", headers=A, json=dict(channel="whatsapp")).json()["subject"] == "", "whatsapp draft has no subject")
    ok(c.post(f"/contacts/{mid}/follow-up-draft", headers=B, json=dict(channel="email")).status_code == 404, "can't draft for others' contact")
    ok(c.post(f"/contacts/{mid}/follow-up-draft", headers=A, json=dict(channel="fax")).status_code == 422, "invalid channel")

    # ---- lead -> contact ----
    c.post(f"/public/{slug}/lead", data=dict(name="Meera", email="meera@m.io", phone="+91 90000 00000", note="Met at booth 12"),
           headers={"x-forwarded-for": "5.5.5.5"}, follow_redirects=False)
    lead = next(l for l in c.get("/leads", headers=A).json() if l["name"] == "Meera")
    r = c.post(f"/leads/{lead['id']}/to-contact", headers=A)
    ok(r.status_code == 201 and r.json()["source"] == "lead" and r.json()["notes"] == "Met at booth 12", "lead saved to network")
    ok(next(l for l in c.get("/leads", headers=A).json() if l["name"] == "Meera")["is_read"], "converted lead marked read")
    ok(c.post(f"/leads/{lead['id']}/to-contact", headers=B).status_code == 404, "can't convert others' lead")

    # ---- CSV ----
    csv3 = c.get("/contacts/export.csv", headers=A).text
    ok("Met at" in csv3 and "SaaSBoomi 2026" in csv3 and "Indiranagar" in csv3, "CSV has met-at and address")

    # rate limit on scans
    SETTINGS.AI_SCANS_PER_DAY = 2
    from app.utils import rate_limit as _rl
    _rl._hits.clear()
    codes = []
    for _ in range(3):
        next_reply["r"] = _Resp(card_json)
        codes.append(c.post("/ai/scan-card", headers=B, files={"file": ("c.jpg", CARD_JPG, "image/jpeg")}).status_code)
    ok(codes == [200, 200, 429], f"scan daily limit {codes}")
    next_reply.clear()


    print("---- phase 4: auth limits, plans, webhooks, hubspot, teams ----")
    import hmac as _hmac4, hashlib as _hl4, json as _j4, urllib.request as _ur4
    import concurrent.futures as _cf4
    from app.services import events as EV, crypto as CR
    from app.utils import rate_limit as RL

    EV.session_factory = S


    class _InlineExecutor:
        """Run background jobs immediately. The test DB is one in-memory SQLite
        connection shared by all threads, so real threads would race on it."""

        def submit(self, fn, *args, **kwargs):
            fn(*args, **kwargs)

        def shutdown(self, wait=True):
            pass


    EV._pool = _InlineExecutor()


    def _drain():
        pass


    # ---- auth brute-force limits ----
    RL._hits.clear()
    codes4 = [c.post("/auth/login", json=dict(identifier="rl@x.com", password="nope")).status_code for _ in range(11)]
    ok(codes4[:10] == [401] * 10 and codes4[10] == 429, f"login: 10 tries per account then 429 {codes4[-2:]}")
    RL._hits.clear()

    # ---- plans ----
    p4 = c.get("/user/plan", headers=A).json()
    ok(p4["plan"]["key"] == "team" and p4["billing_enabled"] is False, "default plan = team while billing is off")
    SETTINGS.DEFAULT_PLAN = "free"
    ok(c.get("/user/plan", headers=A).json()["plan"]["key"] == "free", "DEFAULT_PLAN=free applies")
    _r4 = c.post("/cards", headers=A, json=dict(label="Second")); ok(_r4.status_code == 403 and "up to 1 card" in _r4.json()["detail"], "free plan: one card only")
    ok(c.post("/integrations/webhooks", headers=A, json=dict(url="https://example.com/hook")).status_code == 403, "free plan: no webhooks")
    ok(c.put("/integrations/hubspot", headers=A, json=dict(access_token="pat-na1-xxxxxxxxxxxx")).status_code == 403, "free plan: no CRM")
    ok(c.post("/teams", headers=A, json=dict(name="Acme")).status_code == 403, "free plan: no teams")
    SETTINGS.DEFAULT_PLAN = "team"

    # ---- webhook URL safety (real DNS/IP checks) ----
    ok(EV.url_problem("http://127.0.0.1:8000/x") is not None, "SSRF: loopback blocked")
    ok(EV.url_problem("http://10.1.2.3/x") is not None, "SSRF: private range blocked")
    ok(EV.url_problem("ftp://example.com/x") is not None, "non-http scheme blocked")
    ok(c.post("/integrations/webhooks", headers=A, json=dict(url="http://192.168.1.10/hook")).status_code == 400, "private webhook URL rejected")
    ok(c.post("/integrations/webhooks", headers=A, json=dict(url="https://example.com/h", events=["bogus"])).status_code == 422, "unknown event rejected")

    # fake network for deliveries
    deliveries = []


    class _R4:
        status = 200

        def __init__(self, body=b"{}"):
            self._b = body

        def read(self):
            return self._b

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False


    hub_calls = []


    def _fake_open(req, timeout=0):
        url = req.full_url
        if "hubapi.com" in url:
            hub_calls.append((req.get_method(), url, _j4.loads(req.data) if req.data else None, req.headers.get("Authorization")))
            return _R4(b'{"results": []}')
        deliveries.append((url, req.data, {k.lower(): v for k, v in req.header_items()}))
        return _R4()


    _orig4 = _ur4.urlopen
    _ur4.urlopen = _fake_open
    _real_problem = EV.url_problem
    EV.url_problem = lambda u: None if u.startswith("https://hooks.example.com") else _real_problem(u)

    r = c.post("/integrations/webhooks", headers=A, json=dict(url="https://hooks.example.com/zap", events=["lead.created"]))
    ok(r.status_code == 201 and r.json()["secret"].startswith("whsec_"), "webhook created, secret shown once")
    hook = r.json()
    ok("secret" not in c.get("/integrations", headers=A).json()["webhooks"][0], "secret not listed again")
    t = c.post(f"/integrations/webhooks/{hook['id']}/test", headers=A).json()
    ok(t["ok"] and deliveries[-1][0] == "https://hooks.example.com/zap", "test delivery sent")
    url_, body_, hdr_ = deliveries[-1]
    ts_, sig_ = hdr_["x-smartcard-signature"].split(",")
    expected = _hmac4.new(hook["secret"].encode(), f"{ts_[2:]}.".encode() + body_, _hl4.sha256).hexdigest()
    ok(sig_ == "v1=" + expected and hdr_["x-smartcard-event"] == "lead.created", "HMAC signature verifies")

    n_before = len(deliveries)
    c.post(f"/public/{slug}/lead", data=dict(name="Hook Lead", email="hook@lead.io"), headers={"x-forwarded-for": "4.4.4.4"}, follow_redirects=False)
    _drain()
    ok(len(deliveries) == n_before + 1 and _j4.loads(deliveries[-1][1])["data"]["name"] == "Hook Lead", "lead.created delivered to webhook")
    c.post("/contacts/manual", headers=A, json=dict(name="No Hook", email="nh@x.io"))
    _drain()
    ok(len(deliveries) == n_before + 1, "contact.saved not sent to a lead-only webhook")
    ok(c.delete(f"/integrations/webhooks/{hook['id']}", headers=B).status_code == 404, "can't delete others' webhook")

    # ---- HubSpot ----
    r = c.put("/integrations/hubspot", headers=A, json=dict(access_token="pat-na1-secret-token-123"))
    ok(r.status_code == 200 and hub_calls[-1][0] == "GET" and hub_calls[-1][3] == "Bearer pat-na1-secret-token-123", "HubSpot token verified")
    from app.database.models import Integration as _Int4
    _db4 = S()
    row4 = _db4.query(_Int4).first()
    ok(row4.access_token_enc != "pat-na1-secret-token-123" and CR.decrypt(row4.access_token_enc) == "pat-na1-secret-token-123", "token encrypted at rest")
    _db4.close()
    hub_calls.clear()
    c.post(f"/public/{slug}/lead", data=dict(name="Crm Person", email="crm@p.io", company="CRM Co"), headers={"x-forwarded-for": "4.4.4.5"}, follow_redirects=False)
    _drain()
    up = [h for h in hub_calls if h[1].endswith("/batch/upsert")]
    ok(up and up[-1][2]["inputs"][0]["id"] == "crm@p.io" and up[-1][2]["inputs"][0]["properties"]["firstname"] == "Crm", "lead auto-synced to HubSpot (upsert by email)")
    hub_calls.clear()
    r = c.post("/integrations/hubspot/sync", headers=A)
    _drain()
    ok(r.status_code == 202 and r.json()["queued"] >= 2 and any(h[1].endswith("/batch/upsert") for h in hub_calls), "sync all queued and sent")
    ok(c.get("/integrations", headers=A).json()["hubspot"]["last_sync_count"] >= 2, "last sync recorded")


    def _fake_401(req, timeout=0):
        raise _ur4_err.HTTPError(req.full_url, 401, "unauth", {}, None)


    import urllib.error as _ur4_err
    _ur4.urlopen = _fake_401
    ok(c.put("/integrations/hubspot", headers=B, json=dict(access_token="pat-bad-token-000")).status_code == 400, "bad HubSpot token rejected")
    _ur4.urlopen = _fake_open
    ok(c.delete("/integrations/hubspot", headers=A).status_code == 204, "disconnect HubSpot")

    # ---- Teams ----
    r = c.post("/teams", headers=A, json=dict(name="Acme Inc"))
    ok(r.status_code == 201, "create team")
    ok(c.post("/teams", headers=A, json=dict(name="Second")).status_code == 400, "one team per user")
    inv = c.post("/teams/me/invites", headers=A, json=dict(email="B@X.com")).json()
    ok(inv["email"] == "b@x.com" and inv["token"], "invite sent (email normalised)")
    ok(c.post("/teams/join", headers=C3, json=dict(token=inv["token"])).status_code == 403, "invite can't be used by another email")
    ok(c.get("/teams/me", headers=B).json()["invites"][0]["team_name"] == "Acme Inc", "invitee sees pending invite")
    ok(c.post("/teams/join", headers=B, json=dict(token=inv["token"])).status_code == 200, "invitee joins")
    ok(c.post("/teams/join", headers=B, json=dict(token=inv["token"])).status_code == 404, "invite link single-use")
    me_b = c.get("/teams/me", headers=B).json()
    ok(me_b["my_role"] == "member" and len(me_b["members"]) == 2, "member view")
    ok(c.post("/teams/me/invites", headers=B, json=dict(email="z@x.com")).status_code == 403, "member can't invite")
    ok(c.get("/teams/me/dashboard", headers=B).status_code == 403, "member can't see dashboard")

    SETTINGS.DEFAULT_PLAN = "free"
    ok(c.get("/user/plan", headers=B).json()["plan"]["key"] == "team", "team member inherits team plan")
    SETTINGS.DEFAULT_PLAN = "team"

    ok(c.patch("/teams/me", headers=A, json=dict(brand_color="blue")).status_code == 422, "brand colour validated")
    ok(c.patch("/teams/me", headers=A, json=dict(brand_logo_url="http://x.io/l.png")).status_code == 422, "logo must be https")
    c.patch("/teams/me", headers=A, json=dict(brand_color="#1e40af", brand_logo_url="https://acme.example/logo.png", brand_company="Acme Inc"))
    page_b = c.get(f"/public/view/{bp['slug']}").text
    ok("--gold: #1E40AF" in page_b and "https://acme.example/logo.png" in page_b, "team branding on member's public card")
    ok("Acme Inc" in page_b, "brand company fills empty company")

    dash = c.get("/teams/me/dashboard?days=30", headers=A).json()
    ok(len(dash["members"]) == 2 and dash["totals"]["views"] >= 1, "admin dashboard with member stats")
    csv4 = c.get("/teams/me/leads/export.csv", headers=A).text
    ok("Team member" in csv4 and "Hook Lead" in csv4, "team leads CSV")

    members = c.get("/teams/me", headers=A).json()["members"]
    b_member = next(m for m in members if m["email"] == "b@x.com")
    ok(c.patch(f"/teams/me/members/{b_member['id']}", headers=A, json=dict(role="admin")).json()["role"] == "admin", "owner promotes to admin")
    owner_member = next(m for m in members if m["role"] == "owner")
    ok(c.delete(f"/teams/me/members/{owner_member['id']}", headers=B).status_code == 400, "owner can't be removed")
    ok(c.post("/teams/me/leave", headers=A).status_code == 400, "owner can't leave")
    ok(c.post("/teams/me/leave", headers=B).status_code == 204, "member leaves")
    ok(c.get("/teams/me", headers=B).json()["team"] is None, "left the team")
    ok("--gold: #1E40AF" not in c.get(f"/public/view/{bp['slug']}").text, "branding gone after leaving")

    _ur4.urlopen = _orig4
    EV.url_problem = _real_problem

    assert not failures, f"{len(failures)} check(s) failed: {failures}"
