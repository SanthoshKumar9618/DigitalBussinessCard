"""vCard and CSV builders."""
import csv
import io


def _vesc(value: str | None) -> str:
    """Escape a vCard 3.0 text value."""
    if not value:
        return ""
    return (
        str(value)
        .replace("\\", "\\\\")
        .replace("\n", "\\n")
        .replace("\r", "")
        .replace(",", "\\,")
        .replace(";", "\\;")
    )


def build_vcard(
    *,
    name: str,
    job_title: str | None = None,
    company: str | None = None,
    email: str | None = None,
    phone: str | None = None,
    website: str | None = None,
    note: str | None = None,
    profile_url: str | None = None,
    photo_url: str | None = None,
    socials: dict[str, str | None] | None = None,
) -> str:
    parts = (name or "").strip().split()
    last = parts[-1] if len(parts) > 1 else ""
    first = " ".join(parts[:-1]) if len(parts) > 1 else (parts[0] if parts else "")

    lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        f"N:{_vesc(last)};{_vesc(first)};;;",
        f"FN:{_vesc(name)}",
    ]
    if company:
        lines.append(f"ORG:{_vesc(company)}")
    if job_title:
        lines.append(f"TITLE:{_vesc(job_title)}")
    if phone:
        lines.append(f"TEL;TYPE=CELL:{_vesc(phone)}")
    if email:
        lines.append(f"EMAIL;TYPE=INTERNET:{_vesc(email)}")
    if website:
        lines.append(f"URL:{_vesc(website)}")
    if profile_url:
        lines.append(f"URL;TYPE=SmartCard:{_vesc(profile_url)}")
    for label, value in (socials or {}).items():
        if value:
            lines.append(f"X-SOCIALPROFILE;TYPE={label}:{_vesc(value)}")
    if photo_url:
        lines.append(f"PHOTO;VALUE=URI:{_vesc(photo_url)}")
    if note:
        lines.append(f"NOTE:{_vesc(note)}")
    lines.append("END:VCARD")
    return "\r\n".join(lines) + "\r\n"


def _csv_safe(value) -> str:
    """Prevent spreadsheet formula injection (=, +, -, @ at the start)."""
    s = "" if value is None else str(value)
    if s and s[0] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + s
    return s


def build_csv(headers: list[str], rows: list[list]) -> str:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(headers)
    for row in rows:
        writer.writerow([_csv_safe(v) for v in row])
    # BOM so Excel opens UTF-8 names correctly
    return "﻿" + buf.getvalue()
