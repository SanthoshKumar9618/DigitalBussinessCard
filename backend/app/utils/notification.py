# backend/app/utils/notification.py
"""Outgoing email / SMS.

EMAIL_PROVIDER:
  console  log only (development). OTP codes are logged ONLY in non-production.
  resend   Resend HTTPS API (works on Render, which blocks SMTP)
  smtp     classic SMTP (STARTTLS)

Network sends run on a small background thread pool so API requests never
wait on the email provider.
"""
import json
import logging
import smtplib
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from email.message import EmailMessage
from html import escape

from app.config.settings import settings

logger = logging.getLogger(__name__)

_pool = ThreadPoolExecutor(max_workers=4, thread_name_prefix="mail")


def _is_dev() -> bool:
    return settings.ENVIRONMENT.lower() != "production"


def _provider() -> str:
    return (settings.EMAIL_PROVIDER or "console").lower()


# ---------------------------------------------------------------- transport
def _send_resend(to: str, subject: str, html: str, text: str) -> None:
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps({"from": settings.EMAIL_FROM, "to": [to], "subject": subject, "html": html, "text": text}).encode(),
        headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status >= 300:
                logger.error("Resend returned %s for %s", resp.status, to)
    except urllib.error.HTTPError as e:
        logger.error("Resend error %s for %s: %s", e.code, to, e.read()[:300])


def _send_smtp(to: str, subject: str, html: str, text: str) -> None:
    msg = EmailMessage()
    msg["From"] = settings.EMAIL_FROM or settings.SMTP_EMAIL
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")
    with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=15) as s:
        s.starttls()
        if settings.SMTP_EMAIL and settings.SMTP_PASSWORD:
            s.login(settings.SMTP_EMAIL, settings.SMTP_PASSWORD)
        s.send_message(msg)


def _deliver(to: str, subject: str, html: str, text: str) -> None:
    try:
        if _provider() == "resend":
            _send_resend(to, subject, html, text)
        elif _provider() == "smtp":
            _send_smtp(to, subject, html, text)
    except Exception:
        logger.exception("Email delivery to %s failed", to)


def email_configured() -> bool:
    p = _provider()
    return (p == "resend" and bool(settings.RESEND_API_KEY)) or (p == "smtp" and bool(settings.SMTP_SERVER))


def _dispatch(to: str, subject: str, html: str, text: str, log_body: bool) -> bool:
    if not to:
        return False
    if email_configured():
        _pool.submit(_deliver, to, subject, html, text)
        return True
    # console mode
    if _is_dev() and log_body:
        logger.info("[EMAIL][console] To=%s | Subject=%s\n%s", to, subject, text)
    else:
        logger.info("[EMAIL][console] To=%s | Subject=%s (not delivered: no provider)", to, subject)
    return True


# ---------------------------------------------------------------- templates
def _layout(title: str, body_html: str) -> str:
    return f"""<!doctype html><html><body style="margin:0;background:#F7F7F5;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111827">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:480px;background:#FFFFFF;border-radius:16px;border:1px solid #E5E7EB" cellpadding="0" cellspacing="0">
<tr><td style="padding:24px 28px;border-bottom:3px solid #B08A35;font-weight:700;font-size:18px">SmartCard</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 12px;font-size:20px">{escape(title)}</h1>
{body_html}
</td></tr></table>
<p style="color:#6B7280;font-size:12px;margin-top:16px">You received this because of activity on your SmartCard account.</p>
</td></tr></table></body></html>"""


def _button(href: str, label: str) -> str:
    return (f'<a href="{escape(href, quote=True)}" style="display:inline-block;background:#B08A35;color:#FFFFFF;'
            f'text-decoration:none;font-weight:600;padding:12px 20px;border-radius:12px;margin-top:16px">{escape(label)}</a>')


# ---------------------------------------------------------------- public API
def send_otp_email(to: str, otp: str) -> bool:
    html = _layout("Your verification code", f"""
<p style="margin:0 0 16px;color:#374151">Use this code to continue. It expires in 10 minutes.</p>
<div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#F3F4F6;border-radius:12px;padding:16px;text-align:center">{escape(otp)}</div>
<p style="margin:16px 0 0;color:#6B7280;font-size:13px">If you didn't request this, you can ignore this email.</p>""")
    text = f"Your SmartCard verification code is {otp}. It expires in 10 minutes."
    return _dispatch(to, f"{otp} is your SmartCard code", html, text, log_body=True)


def send_lead_alert(to: str, owner_name: str, lead: dict, inbox_url: str | None = None) -> bool:
    rows = "".join(
        f'<tr><td style="padding:6px 0;color:#6B7280;width:90px">{label}</td><td style="padding:6px 0">{escape(str(lead[key]))}</td></tr>'
        for key, label in (("email", "Email"), ("phone", "Phone"), ("company", "Company"), ("note", "Note"))
        if lead.get(key)
    )
    html = _layout(f"{lead['name']} shared their details", f"""
<p style="margin:0 0 12px;color:#374151">Hi {escape(owner_name.split()[0] if owner_name else 'there')}, someone just opened your card and sent you their contact details.</p>
<table role="presentation" style="width:100%;border-collapse:collapse;font-size:15px">{rows}</table>
{_button(inbox_url, "Open in SmartCard") if inbox_url else ""}""")
    text = f"{lead['name']} shared their details with you on SmartCard.\n" + "\n".join(
        f"{k.title()}: {lead[k]}" for k in ("email", "phone", "company", "note") if lead.get(k)
    )
    return _dispatch(to, f"New lead: {lead['name']}", html, text, log_body=True)


def send_email(to: str, subject: str, body: str | None = None) -> bool:
    """Plain notification (e.g. a saved contact changed their details)."""
    body = body or ""
    html = _layout(subject, "".join(f'<p style="margin:0 0 8px;color:#374151">{escape(line)}</p>' for line in body.splitlines() if line.strip()))
    return _dispatch(to, subject, html, body, log_body=True)


def send_sms(to_phone: str, message: str) -> bool:
    # No SMS provider yet; never log the message body in production (may hold an OTP).
    if _is_dev():
        logger.info("[SMS][console] To=%s | Message=%s", to_phone, message)
    else:
        logger.info("[SMS][console] To=%s (not delivered: no provider)", to_phone)
    return True
