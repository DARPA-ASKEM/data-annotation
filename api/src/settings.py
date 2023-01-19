from pydantic import BaseSettings


class Settings(BaseSettings):

    BIND_PORT: int = 8000

    DATASET_STORAGE_BASE_URL: str
    DATA_ANNOTATION_URL: str

    TDS_URL: str = "http://data-service-api:8000"

    REDIS_HOST: str
    REDIS_PORT: int = 6379

    DATASET_STORAGE_BASE_URL: str = "file:///datasets/"

    CONFIG_STORAGE_BASE: str = "file:///data-annotation/configs/"

    UVICORN_RELOAD: bool = False

    DKG_URL: str
    DKG_API_PORT: str

    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
