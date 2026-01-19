import smtplib
from email.message import EmailMessage
from app.config.settings import settings



def send_otp_email(to_email: str, otp: str):
    msg = EmailMessage()
    msg["Subject"] = "Your Verification Code"
    msg["From"] = settings.smtp_email
    msg["To"] = to_email

    msg.set_content(
        f"""
Your verification code is: {otp}

This code will expire in 5 minutes.

If you did not request this, ignore this email.
"""
    )

    with smtplib.SMTP(settings.smtp_server, settings.smtp_port) as server:
        server.starttls()
        server.login(settings.smtp_email, settings.smtp_password)
        server.send_message(msg)
