from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", "../.env"), extra="ignore")

    brand_name: str = "KrishiSetu AI"
    app_env: str = "development"
    secret_key: str = "dev-only-insecure-key-change-me"
    access_token_expire_minutes: int = 60
    cookie_secure: bool = False
    cors_origins: str = "http://localhost:5173"

    database_url: str = "sqlite:///./krishisetu_dev.db"

    qdrant_url: str = "http://localhost:6333"
    qdrant_collection: str = "krishi_knowledge"
    embedding_model: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    embedding_dim: int = 384
    rag_min_score: float = 0.25        # cosine relevance gate; tune per embedder via the retrieval-test page
    embedding_backend: str = "hash"  # "hash" (offline) | "sentence-transformers"

    llm_provider_order: str = "groq,mistral,gemini"
    llm_timeout_seconds: float = 20
    llm_max_retries: int = 1
    llm_cooldown_seconds: int = 60
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    mistral_api_key: str = ""
    mistral_model: str = "mistral-small-latest"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    upload_dir: str = "./storage/uploads"
    max_upload_mb: int = 8
    knowledge_dir: str = "./storage/knowledge"

    model_artifact_dir: str = "./ml/artifacts"
    min_confidence_for_display: float = 0.5

    demo_password: str = ""
    rate_limit_multiplier: int = 1   # tests set high; keep 1 in real deployments

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
