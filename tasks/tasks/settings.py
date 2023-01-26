from pydantic import BaseSettings


class Settings(BaseSettings):

    BIND_PORT: int = 8000

    DATASET_STORAGE_BASE_URL: str
    CSV_FILE_NAME: str = "raw_data.csv"
    DATA_ANNOTATION_URL: str

    REDIS_HOST: str
    REDIS_PORT: int = 6379

    UVICORN_RELOAD: bool = False

    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
