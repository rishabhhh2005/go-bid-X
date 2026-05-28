import asyncio

from app.services.email_service import send_verification_email


async def main():
    await send_verification_email(
        "rishabh1269.be23@chitkara.edu.in",
        "123456"
    )

asyncio.run(main())