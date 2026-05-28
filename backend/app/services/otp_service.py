from datetime import datetime, timedelta

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.email_verification import EmailVerificationToken
from app.utils.otp import generate_otp


OTP_EXPIRE_MINUTES = 5


async def create_email_verification(
    db: AsyncSession,
    user_id
):

    # invalidate previous unused OTPs
    await db.execute(
        update(EmailVerificationToken)
        .where(
            EmailVerificationToken.user_id == user_id,
            EmailVerificationToken.used == False
        )
        .values(used=True)
    )

    otp = generate_otp()

    verification = EmailVerificationToken(
        user_id=user_id,
        otp=otp,
        expires_at=datetime.utcnow() + timedelta(
            minutes=OTP_EXPIRE_MINUTES
        )
    )

    db.add(verification)

    await db.commit()

    return otp