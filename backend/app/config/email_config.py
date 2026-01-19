from fastapi_mail import ConnectionConfig

conf = ConnectionConfig(
    MAIL_USERNAME="santhoshbhavya2001@gmail.com",             # your Gmail
    MAIL_PASSWORD="iqib yipw yrif zunh",       # paste here
    MAIL_FROM="yourgmail@gmail.com",
    MAIL_PORT=587,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True
)
