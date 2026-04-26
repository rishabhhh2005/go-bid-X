from datetime import datetime, timezone
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, model_validator


def _utc_datetime_encoder(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    else:
        value = value.astimezone(timezone.utc)
    return value.isoformat().replace('+00:00', 'Z')


class AuctionConfigCreate(BaseModel):
    trigger_window_minutes: int
    extension_duration_minutes: int
    extension_trigger_type: Literal["bid_received", "any_rank_change", "l1_rank_change"]


class RFQCreate(BaseModel):
    reference_id: str
    name: str
    bid_start_time: datetime
    bid_close_time: datetime
    forced_bid_close_time: datetime
    pickup_service_date: Optional[datetime] = None
    is_british_auction: bool = False
    auction_config: Optional[AuctionConfigCreate] = None

    @model_validator(mode='after')
    def validate_auction_config(self) -> 'RFQCreate':
        if self.is_british_auction and not self.auction_config:
            raise ValueError("auction_config is required when is_british_auction is True")
        if not self.is_british_auction and self.auction_config:
            self.auction_config = None
        return self


class AuctionConfigResponse(AuctionConfigCreate):
    id: UUID
    rfq_id: UUID
    max_extensions: int

    class Config:
        from_attributes = True


class RFQResponse(BaseModel):
    id: UUID
    reference_id: str
    name: str
    buyer_id: UUID
    bid_start_time: datetime
    bid_close_time: datetime
    current_bid_close_time: datetime
    forced_bid_close_time: datetime
    pickup_service_date: Optional[datetime] = None
    is_british_auction: bool
    status: str
    created_at: datetime
    current_lowest_bid: Optional[float] = None
    auction_config: AuctionConfigResponse

    class Config:
        from_attributes = True
        json_encoders = {datetime: _utc_datetime_encoder}
