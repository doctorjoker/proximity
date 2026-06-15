from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Proximity by NOVASpace"
    environment: str = "foundation"
    database_url: str = "postgresql://proximity:proximity_db@127.0.0.1:5434/proximity_db"
    genieacs_nbi_url: str = "http://genieacs-nbi:7557"

    class Config:
        env_file = ".env"


settings = Settings()
