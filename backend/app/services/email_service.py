import aiosmtplib

from email.message import EmailMessage

from app.config import settings


async def send_verification_email(
    recipient_email: str,
    otp: str
):

    message = EmailMessage()

    message["From"] = settings.SMTP_EMAIL
    message["To"] = recipient_email
    message["Subject"] = "GoBidX Email Verification"

    message.set_content(
        f"""
Your GoBidX verification code is:

{otp}

This OTP expires in 5 minutes.
"""
    )

    await aiosmtplib.send(
        message,
        hostname=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        username=settings.SMTP_EMAIL,
        password=settings.SMTP_PASSWORD,
        start_tls=True,
    )