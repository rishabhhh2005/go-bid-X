from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


def _utc_datetime_encoder(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    else:
        value = value.astimezone(timezone.utc)
    return value.isoformat().replace('+00:00', 'Z')


class BidCreate(BaseModel):
    rfq_id: str
    carrier_name: str
    freight_charges: Decimal
    origin_charges: Decimal = Decimal("0")
    destination_charges: Decimal = Decimal("0")
    total_amount: Decimal
    transit_time_days: Optional[int] = None
    quote_validity_date: Optional[datetime] = None


class BidResponse(BaseModel):
    id: UUID
    rfq_id: UUID
    supplier_id: UUID
    carrier_name: str
    freight_charges: Decimal
    origin_charges: Decimal
    destination_charges: Decimal
    total_amount: Decimal
    transit_time_days: Optional[int] = None
    quote_validity_date: Optional[datetime] = None
    rank: Optional[int] = None
    is_active: bool
    submitted_at: datetime
    supplier_email: Optional[str] = None
    supplier_name: Optional[str] = None

    class Config:
        from_attributes = True
        json_encoders = {datetime: _utc_datetime_encoder}
