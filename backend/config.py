import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "examguard-super-secret-key-change-in-production")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "examguard-jwt-secret-key-change-in-production")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=12)
    
    # Database URL: Supports MySQL, PostgreSQL, SQLite
    # Example MySQL: mysql+pymysql://examguard_user:password@localhost:3306/examguard_db
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///examguard.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 280,
    }
    
    # Gemini AI configuration
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    
    # CORS Configuration
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    CORS_ORIGINS = [
        FRONTEND_ORIGIN,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
    
    # Face & Biometric Settings
    FACE_SIMILARITY_THRESHOLD = float(os.getenv("FACE_SIMILARITY_THRESHOLD", "0.65"))
    FACE_LIVENESS_REQUIRED = os.getenv("FACE_LIVENESS_REQUIRED", "true").lower() == "true"
    
    # Proctoring Defaults
    PROCTORING_WARNING_LIMIT = int(os.getenv("PROCTORING_WARNING_LIMIT", "5"))
    AUTO_SUBMIT_ON_VIOLATIONS = os.getenv("AUTO_SUBMIT_ON_VIOLATIONS", "false").lower() == "true"
    EVENT_COOLDOWN_SECONDS = int(os.getenv("EVENT_COOLDOWN_SECONDS", "3"))
    
    # Upload folder
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload
