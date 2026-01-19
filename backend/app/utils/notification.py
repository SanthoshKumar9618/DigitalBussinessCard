# backend/app/utils/notification.py
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import BackgroundTasks
from app.config.settings import settings

# ---------------- Email ----------------
def send_email(to: str, subject: str, otp: str = None, body: str = None) -> bool:
    """Send email using SMTP from settings. Can send OTP or general email."""
    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = settings.smtp_email
        msg["To"] = to
        msg["Subject"] = subject

        if otp:
            # OTP email format
            html = f"""
            <html>
                <body style="font-family: Arial;">
                    <h2 style="color: #4A90E2;">Your OTP Verification Code</h2>
                    <p>Your One-Time Password (OTP) is:</p>
                    <h1 style="background: #4A90E2; color: white; display: inline-block;
                        padding: 10px 20px; border-radius: 8px;">
                        {otp}
                    </h1>
                    <p>This OTP will expire in <b>10 minutes</b>.</p>
                    <br/>
                    <p>If you didn't request this, please ignore the email.</p>
                </body>
            </html>
            """
        elif body:
            # General email format
            html = f"""
            <html>
                <body style="font-family: Arial;">
                    {body.replace(chr(10), '<br/>')}
                </body>
            </html>
            """
        else:
            logging.error("Either otp or body must be provided")
            return False

        msg.attach(MIMEText(html, "html"))

        server = smtplib.SMTP(settings.smtp_server, settings.smtp_port)
        server.starttls()
        server.login(settings.smtp_email, settings.smtp_password)
        server.sendmail(settings.smtp_email, to, msg.as_string())
        server.quit()

        logging.info(f"Email sent to {to}")
        return True
    except Exception as e:
        logging.error(f"Email error: {e}")
        return False

# ---------------- SMS ----------------
def send_sms(to_phone: str, message: str) -> bool:
    """
    Send OTP SMS.
    Currently a placeholder: logs the message.
    Replace with real SMS provider integration if needed.
    """
    logging.info(f"[SMS] To: {to_phone} | Message: {message}")
    return True

# ---------------- OTP ----------------
def send_otp(email: str = None, phone: str = None, otp: str = None, background_tasks: BackgroundTasks = None):
    """Send OTP via email and/or SMS. Supports FastAPI BackgroundTasks."""
    subject = "Your OTP Code"

    if email:
        if background_tasks:
            background_tasks.add_task(send_email, email, subject, otp)
        else:
            send_email(email, subject, otp)

    if phone:
        sms_content = f"Your OTP is: {otp}"
        if background_tasks:
            background_tasks.add_task(send_sms, phone, sms_content)
        else:
            send_sms(phone, sms_content)

    return True
