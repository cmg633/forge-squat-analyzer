"""Application configuration via environment variables."""
import os
import tempfile
from pydantic_settings import BaseSettings

_default_tmp = tempfile.gettempdir()

class Settings(BaseSettings):
    FRONTEND_URL: str = "https://forge-squat.vercel.app"
    UPLOAD_DIR: str = os.path.join(_default_tmp, "forge_uploads")
    OUTPUT_DIR: str = os.path.join(_default_tmp, "forge_outputs")
    MAX_FILE_MB: int = 100
    JOB_TTL_SECONDS: int = 3600 * 6  # 6 hours
    GEMINI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    PORT: int = 7860

    @property
    def MAX_FILE_SIZE_BYTES(self) -> int:
        return self.MAX_FILE_MB * 1024 * 1024

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

