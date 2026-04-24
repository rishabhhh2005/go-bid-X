from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel


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
    auction_config: AuctionConfigCreate


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
    auction_config: AuctionConfigResponse

    class Config:
        from_attributes = True
