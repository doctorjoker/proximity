from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Proximity by NOVASpace"
    environment: str = "foundation"

    database_url: str = (
        "postgresql://proximity:proximity_db@127.0.0.1:5434/proximity_db"
    )

    genieacs_nbi_url: str = "http://genieacs-nbi:7557"

    # ------------------------------------------------------------------
    # Diagnostic Server
    # ------------------------------------------------------------------

    diagnostic_server_enabled: bool = True

    diagnostic_server_base_url: str = "http://10.40.0.22:8081"

    diagnostic_download_file: str = "100MB.bin"

    diagnostic_timeout: int = 300

    diagnostic_poll_interval: int = 3

    class Config:
        env_file = ".env"


settings = Settings()
