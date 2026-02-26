import uuid
from datetime import datetime
from pydantic import BaseModel, Field

from enums import Manufacturer


class ProviderLinkResponse(BaseModel):
    provider_id: uuid.UUID
    provider_name: str
    is_enabled: bool

    model_config = {"from_attributes": True}


class ModelCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    display_name: str = Field(min_length=1, max_length=100)
    manufacturer: Manufacturer
    is_enabled: bool = True
    provider_ids: list[uuid.UUID] = Field(default_factory=list)


class ModelUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    display_name: str | None = Field(default=None, min_length=1, max_length=100)
    manufacturer: Manufacturer | None = None
    is_enabled: bool | None = None
    provider_ids: list[uuid.UUID] | None = None


class ModelResponse(BaseModel):
    id: uuid.UUID
    name: str
    display_name: str
    manufacturer: str
    is_enabled: bool
    providers: list[ProviderLinkResponse]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
