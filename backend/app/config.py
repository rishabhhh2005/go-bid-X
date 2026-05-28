from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    RESEND_API_KEY: str
    FROM_EMAIL: str = "GoBidX <onboarding@resend.dev>"
    
    FRONTEND_URL: str = "http://localhost:5173,https://go-bid-x-frontend.vercel.app"

    
    model_config = SettingsConfigDict(env_file=".env")

settings = Settings()