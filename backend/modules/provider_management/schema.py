import uuid
from datetime import datetime
from pydantic import BaseModel, Field

from enums import Manufacturer


# ── Provider ──

class ProviderCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    api_key: str = Field(min_length=1, max_length=500)
    base_url_map: dict[Manufacturer, str] = Field(default_factory=dict)
    is_enabled: bool = True


class ProviderUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=50)
    api_key: str | None = Field(default=None, min_length=1, max_length=500)
    base_url_map: dict[Manufacturer, str] | None = None
    is_enabled: bool | None = None


class ProviderResponse(BaseModel):
    id: uuid.UUID
    name: str
    base_url_map: dict
    is_enabled: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Model ──

class ModelCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    display_name: str = Field(min_length=1, max_length=100)
    manufacturer: Manufacturer
    is_enabled: bool = True


class ModelUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    display_name: str | None = Field(default=None, min_length=1, max_length=100)
    manufacturer: Manufacturer | None = None
    is_enabled: bool | None = None


class ModelResponse(BaseModel):
    id: uuid.UUID
    provider_id: uuid.UUID
    name: str
    display_name: str
    manufacturer: str
    is_enabled: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
