import resend
from app.config import settings

# Initialize Resend with the API key
resend.api_key = settings.RESEND_API_KEY

async def send_verification_email(
    recipient_email: str,
    otp: str
):
    """
    Sends a verification email with the OTP using Resend SDK.
    Note: Resend's Python SDK is currently synchronous but we keep the 
    async signature for compatibility with the existing flow.
    """
    
    html_content = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
        <h2 style="color: #1e293b;">GoBidX Email Verification</h2>
        <p style="color: #475569; font-size: 16px;">Your verification code is:</p>
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-radius: 12px; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #2563eb;">{otp}</span>
        </div>
        <p style="color: #64748b; font-size: 14px;">This OTP expires in 5 minutes.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">If you didn't request this code, you can safely ignore this email.</p>
    </div>
    """

    params = {
        "from": settings.FROM_EMAIL,
        "to": [recipient_email],
        "subject": "GoBidX Email Verification",
        "html": html_content,
    }

    try:
        # Resend SDK call
        resend.Emails.send(params)
    except Exception as e:
        # Re-raise to be caught by the router, or log it
        raise e
