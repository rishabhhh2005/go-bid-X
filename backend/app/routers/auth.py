from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import create_access_token, get_current_user
from app.dependencies import get_db
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import UserCreate, UserLogin, UserResponse
from app.security import hash_password, verify_password

from app.services.email_service import send_verification_email
from app.services.otp_service import create_email_verification

from datetime import datetime

from app.models.email_verification import EmailVerificationToken
from app.schemas.email_verification import VerifyEmailRequest, ResendOTPRequest, VerifyEmailResponse

router = APIRouter()


@router.post("/register", response_model=UserResponse)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == user_in.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        company_name=user_in.company_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    otp = await create_email_verification(
        db=db,
        user_id=user.id
    )

    await send_verification_email(
        recipient_email=user.email,
        otp=otp
    )

    return user

@router.post("/verify-email", response_model=VerifyEmailResponse)
async def verify_email(
    payload: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db)
):

    result = await db.execute(
        select(User).where(User.email == payload.email)
    )

    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    token_result = await db.execute(
        select(EmailVerificationToken)
        .where(
            EmailVerificationToken.user_id == user.id,
            EmailVerificationToken.otp == payload.otp,
            EmailVerificationToken.used == False
        )
        .order_by(EmailVerificationToken.created_at.desc())
    )

    verification_token = token_result.scalar_one_or_none()

    if not verification_token:
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP"
        )

    if verification_token.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="OTP expired"
        )

    verification_token.used = True

    user.is_verified = True

    await db.commit()

    access_token = create_access_token(
        {
            "sub": str(user.id),
            "role": user.role
        }
    )

    return {
        "message": "Email verified successfully",
        "user": user,
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.post("/login", response_model=Token)
async def login(login_in: UserLogin, db: AsyncSession = Depends(get_db)):

    result = await db.execute(
        select(User).where(User.email == login_in.email)
    )

    user = result.scalar_one_or_none()

    if not user or not verify_password(
        login_in.password,
        user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email first"
        )

    access_token = create_access_token(
        {
            "sub": str(user.id),
            "role": user.role
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }
    
@router.post("/resend-otp")
async def resend_otp(
    payload: ResendOTPRequest,
    db: AsyncSession = Depends(get_db)
):

    result = await db.execute(
        select(User).where(User.email == payload.email)
    )

    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if user.is_verified:
        raise HTTPException(
            status_code=400,
            detail="Email already verified"
        )

    otp = await create_email_verification(
        db=db,
        user_id=user.id
    )

    await send_verification_email(
        recipient_email=user.email,
        otp=otp
    )

    return {
        "message": "OTP resent successfully"
    }

@router.get("/me", response_model=UserResponse)
async def read_me(current_user: User = Depends(get_current_user)):
    return current_user
