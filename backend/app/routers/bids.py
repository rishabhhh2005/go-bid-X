from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.dependencies import get_db
from app.models.activity_log import ActivityLog
from app.models.auction_config import AuctionConfig
from app.models.bid import Bid
from app.models.rfq import RFQ
from app.models.user import User
from app.routers.ws import manager
from app.schemas.bid import BidCreate, BidResponse

router = APIRouter()


def _normalize_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def _build_bid_response(bid: Bid) -> BidResponse:
    return BidResponse.from_orm(bid)


async def _close_rfq_if_expired(rfq: RFQ, db: AsyncSession) -> None:
    now = datetime.utcnow()
    if rfq.status == "active" and now >= _normalize_datetime(rfq.current_bid_close_time):
        rfq.status = "closed"
        log = ActivityLog(
            rfq_id=rfq.id,
            event_type="auction_closed",
            description="Auction closed because bidding time expired.",
            new_close_time=rfq.current_bid_close_time,
        )
        db.add(log)
        await db.commit()
        await db.refresh(rfq)


async def _apply_rank_updates(rfq_id: UUID, db: AsyncSession) -> None:
    result = await db.execute(
        select(Bid).where(Bid.rfq_id == rfq_id, Bid.is_active == True).order_by(Bid.total_amount.asc(), Bid.submitted_at.asc())
    )
    active_bids = result.scalars().all()
    for rank, bid in enumerate(active_bids, start=1):
        bid.rank = rank


async def _maybe_extend_auction(rfq: RFQ, config: AuctionConfig, db: AsyncSession, supplier_id: UUID) -> bool:
    now = datetime.utcnow()
    if not config or config.trigger_window_minutes <= 0:
        return False

    trigger_time = rfq.current_bid_close_time - timedelta(minutes=config.trigger_window_minutes)
    if now < trigger_time or rfq.current_bid_close_time >= rfq.forced_bid_close_time:
        return False

    new_close_time = rfq.current_bid_close_time + timedelta(minutes=config.extension_duration_minutes)
    if new_close_time > rfq.forced_bid_close_time:
        new_close_time = rfq.forced_bid_close_time

    if new_close_time > rfq.current_bid_close_time:
        rfq.current_bid_close_time = new_close_time
        log = ActivityLog(
            rfq_id=rfq.id,
            event_type="time_extended",
            description="Auction extended because a bid arrived during the trigger window.",
            extension_reason=config.extension_trigger_type,
            new_close_time=new_close_time,
            triggered_by_supplier_id=supplier_id,
        )
        db.add(log)
        return True
    return False


@router.post("/bid", response_model=BidResponse)
async def place_bid(bid_in: BidCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.role != "supplier":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only suppliers can place bids")

    rfq_result = await db.execute(select(RFQ).where(RFQ.id == bid_in.rfq_id))
    rfq = rfq_result.scalar_one_or_none()
    if not rfq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFQ not found")

    await _close_rfq_if_expired(rfq, db)
    now = datetime.utcnow()
    if rfq.status != "active" or now >= _normalize_datetime(rfq.current_bid_close_time) or now < _normalize_datetime(rfq.bid_start_time):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="RFQ is not accepting bids")

    await db.execute(
        update(Bid)
        .where(Bid.rfq_id == rfq.id, Bid.supplier_id == current_user.id, Bid.is_active == True)
        .values(is_active=False)
    )

    bid = Bid(
        rfq_id=bid_in.rfq_id,
        supplier_id=current_user.id,
        carrier_name=bid_in.carrier_name,
        freight_charges=bid_in.freight_charges,
        origin_charges=bid_in.origin_charges,
        destination_charges=bid_in.destination_charges,
        total_amount=bid_in.total_amount,
        transit_time_days=bid_in.transit_time_days,
        quote_validity_date=bid_in.quote_validity_date,
    )
    db.add(bid)

    config_result = await db.execute(select(AuctionConfig).where(AuctionConfig.rfq_id == rfq.id))
    config = config_result.scalar_one_or_none()

    await _apply_rank_updates(rfq.id, db)

    extended = await _maybe_extend_auction(rfq, config, db, current_user.id)
    bid_log = ActivityLog(
        rfq_id=rfq.id,
        event_type="bid_submitted",
        description=f"Supplier {current_user.email} submitted a bid.",
        triggered_by_supplier_id=current_user.id,
    )
    db.add(bid_log)

    await db.commit()
    await db.refresh(bid)
    await db.refresh(rfq)

    if extended:
        await db.refresh(rfq)
        await db.refresh(bid)

    await _apply_rank_updates(rfq.id, db)
    await db.commit()
    await db.refresh(bid)

    update_result = await db.execute(
        select(Bid).where(Bid.rfq_id == rfq.id, Bid.is_active == True).order_by(Bid.total_amount.asc(), Bid.submitted_at.asc())
    )
    ranks = [
        {
            "supplier_id": str(active_bid.supplier_id),
            "total_amount": float(active_bid.total_amount),
            "rank": active_bid.rank,
        }
        for active_bid in update_result.scalars().all()
    ]

    message = {
        "event": "new_bid",
        "bid": {
            "id": str(bid.id),
            "rfq_id": str(bid.rfq_id),
            "supplier_id": str(bid.supplier_id),
            "total_amount": float(bid.total_amount),
            "rank": bid.rank,
            "submitted_at": bid.submitted_at.isoformat(),
        },
        "ranks": ranks,
        "current_bid_close_time": rfq.current_bid_close_time.isoformat(),
        "extended": extended,
    }
    await manager.broadcast(str(rfq.id), message)
    return _build_bid_response(bid)


@router.get("/bids/{rfq_id}", response_model=list[BidResponse])
async def list_bids(rfq_id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Bid).where(Bid.rfq_id == rfq_id).order_by(Bid.total_amount.asc(), Bid.submitted_at.asc()))
    bids = result.scalars().all()
    return [_build_bid_response(bid) for bid in bids]
