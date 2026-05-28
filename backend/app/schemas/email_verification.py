from pydantic import BaseModel, EmailStr


from app.schemas.user import UserResponse


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    otp: str

class VerifyEmailResponse(BaseModel):
    message: str
    user: UserResponse
    access_token: str
    token_type: str = "bearer"

    
class ResendOTPRequest(BaseModel):
    email: EmailStr