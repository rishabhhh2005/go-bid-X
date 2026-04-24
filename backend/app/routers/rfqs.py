from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.auction_config import AuctionConfig
from app.models.rfq import RFQ
from app.models.activity_log import ActivityLog
from app.schemas.rfq import AuctionConfigCreate, RFQCreate, RFQResponse
from app.auth import get_current_user
from app.models.user import User

router = APIRouter()


from typing import Optional


def _normalize_datetime(value: Optional[datetime]) -> Optional[datetime]:
    if value is None or value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def build_rfq_response(rfq: RFQ, config: AuctionConfig) -> dict:
    return {
        "id": rfq.id,
        "reference_id": rfq.reference_id,
        "name": rfq.name,
        "buyer_id": rfq.buyer_id,
        "bid_start_time": rfq.bid_start_time,
        "bid_close_time": rfq.bid_close_time,
        "current_bid_close_time": rfq.current_bid_close_time,
        "forced_bid_close_time": rfq.forced_bid_close_time,
        "pickup_service_date": rfq.pickup_service_date,
        "is_british_auction": rfq.is_british_auction,
        "status": rfq.status,
        "created_at": rfq.created_at,
        "auction_config": config,
    }


async def _close_rfq_if_expired(rfq: RFQ, db: AsyncSession) -> None:
    now = datetime.utcnow()
    if rfq.status == "active" and now >= _normalize_datetime(rfq.current_bid_close_time):
        rfq.status = "closed"
        log = ActivityLog(
            rfq_id=rfq.id,
            event_type="auction_closed",
            description="Auction closed because current close time was reached.",
            new_close_time=rfq.current_bid_close_time,
        )
        db.add(log)
        await db.commit()
        await db.refresh(rfq)


@router.post("/rfq", response_model=RFQResponse)
async def create_rfq(rfq_in: RFQCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.role != "buyer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only buyers can create RFQs")

    bid_start_time = _normalize_datetime(rfq_in.bid_start_time)
    bid_close_time = _normalize_datetime(rfq_in.bid_close_time)
    forced_bid_close_time = _normalize_datetime(rfq_in.forced_bid_close_time)
    current_time = datetime.utcnow()

    if bid_close_time <= bid_start_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="bid_close_time must be after bid_start_time")
    if forced_bid_close_time < bid_close_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="forced_bid_close_time must be after bid_close_time")

    pickup_service_date = _normalize_datetime(rfq_in.pickup_service_date)
    rfq = RFQ(
        reference_id=rfq_in.reference_id,
        name=rfq_in.name,
        buyer_id=current_user.id,
        bid_start_time=bid_start_time,
        bid_close_time=bid_close_time,
        current_bid_close_time=bid_close_time,
        forced_bid_close_time=forced_bid_close_time,
        pickup_service_date=pickup_service_date,
        is_british_auction=rfq_in.is_british_auction,
        status="active" if bid_start_time <= current_time < bid_close_time else "draft",
    )
    db.add(rfq)
    await db.flush()

    config_in: AuctionConfigCreate = rfq_in.auction_config
    config = AuctionConfig(
        rfq_id=rfq.id,
        trigger_window_minutes=config_in.trigger_window_minutes,
        extension_duration_minutes=config_in.extension_duration_minutes,
        extension_trigger_type=config_in.extension_trigger_type,
    )
    db.add(config)
    await db.commit()
    await db.refresh(rfq)
    await db.refresh(config)

    return build_rfq_response(rfq, config)


@router.get("/rfq/{rfq_id}", response_model=RFQResponse)
async def read_rfq(rfq_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(RFQ).where(RFQ.id == rfq_id))
    rfq = result.scalar_one_or_none()
    if not rfq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFQ not found")

    await _close_rfq_if_expired(rfq, db)

    config_result = await db.execute(select(AuctionConfig).where(AuctionConfig.rfq_id == rfq.id))
    config = config_result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Auction configuration missing")

    return build_rfq_response(rfq, config)
