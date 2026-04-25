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


async def _maybe_extend_auction(
    rfq: RFQ,
    config: AuctionConfig,
    db: AsyncSession,
    supplier_id: UUID,
    rank_changed: bool = False,
    l1_changed: bool = False
) -> bool:
    now = datetime.utcnow()
    if not config or config.trigger_window_minutes <= 0:
        return False

    trigger_time = rfq.current_bid_close_time - timedelta(minutes=config.trigger_window_minutes)
    if now < trigger_time or rfq.current_bid_close_time >= rfq.forced_bid_close_time:
        return False

    # Check trigger condition
    should_extend = False
    reason_desc = ""

    if config.extension_trigger_type == "bid_received":
        should_extend = True
        reason_desc = "A new bid was received in the trigger window."
    elif config.extension_trigger_type == "any_rank_change" and rank_changed:
        should_extend = True
        reason_desc = "A supplier rank change occurred in the trigger window."
    elif config.extension_trigger_type == "l1_rank_change" and l1_changed:
        should_extend = True
        reason_desc = "The lowest bidder (L1) changed in the trigger window."

    if not should_extend:
        return False

    new_close_time = rfq.current_bid_close_time + timedelta(minutes=config.extension_duration_minutes)
    if new_close_time > rfq.forced_bid_close_time:
        new_close_time = rfq.forced_bid_close_time

    if new_close_time > rfq.current_bid_close_time:
        rfq.current_bid_close_time = new_close_time
        log = ActivityLog(
            rfq_id=rfq.id,
            event_type="time_extended",
            description=reason_desc,
            extension_reason=config.extension_trigger_type,
            new_close_time=new_close_time,
            triggered_by_supplier_id=supplier_id,
        )
        db.add(log)
        return True
    return False


async def _get_rfq_by_identifier(identifier: str, db: AsyncSession) -> RFQ | None:
    rfq = None
    try:
        rfq_result = await db.execute(select(RFQ).where(RFQ.id == UUID(identifier)))
        rfq = rfq_result.scalar_one_or_none()
    except (ValueError, TypeError):
        rfq = None

    if rfq is None:
        result = await db.execute(select(RFQ).where(RFQ.reference_id == identifier))
        rfq = result.scalar_one_or_none()
    return rfq


@router.post("/bid", response_model=BidResponse)
async def place_bid(bid_in: BidCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.role != "supplier":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only suppliers can place bids")

    rfq = await _get_rfq_by_identifier(str(bid_in.rfq_id), db)
    if not rfq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFQ not found")

    await _close_rfq_if_expired(rfq, db)
    now = datetime.utcnow()
    bid_start_time = _normalize_datetime(rfq.bid_start_time)
    current_close_time = _normalize_datetime(rfq.current_bid_close_time)

    if rfq.status != "active":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="RFQ is not active")
    if now < bid_start_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="RFQ bidding has not started yet")
    if now >= current_close_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="RFQ bidding is closed")

    # Capture state before new bid
    old_l1_supplier_id = None
    old_ranks = {}
    
    existing_bids_result = await db.execute(
        select(Bid).where(Bid.rfq_id == rfq.id, Bid.is_active == True)
    )
    for b in existing_bids_result.scalars().all():
        old_ranks[b.supplier_id] = b.rank
        if b.rank == 1:
            old_l1_supplier_id = b.supplier_id

    # Deactivate previous bid from this supplier
    await db.execute(
        update(Bid)
        .where(Bid.rfq_id == rfq.id, Bid.supplier_id == current_user.id, Bid.is_active == True)
        .values(is_active=False)
    )

    # Add new bid
    bid = Bid(
        rfq_id=rfq.id,
        supplier_id=current_user.id,
        carrier_name=bid_in.carrier_name,
        freight_charges=bid_in.freight_charges,
        origin_charges=bid_in.origin_charges,
        destination_charges=bid_in.destination_charges,
        total_amount=bid_in.total_amount,
        transit_time_days=bid_in.transit_time_days,
        quote_validity_date=_normalize_datetime(bid_in.quote_validity_date) if bid_in.quote_validity_date else None,
    )
    db.add(bid)
    await db.flush() # Get ID and allow ranking

    # Apply rank updates
    await _apply_rank_updates(rfq.id, db)
    await db.refresh(bid)

    # Capture state after new bid
    new_l1_supplier_id = None
    rank_changed = False
    
    active_bids_result = await db.execute(
        select(Bid).where(Bid.rfq_id == rfq.id, Bid.is_active == True)
    )
    active_bids = active_bids_result.scalars().all()
    for b in active_bids:
        if b.rank == 1:
            new_l1_supplier_id = b.supplier_id
        if b.supplier_id not in old_ranks or old_ranks[b.supplier_id] != b.rank:
            rank_changed = True

    l1_changed = old_l1_supplier_id != new_l1_supplier_id

    config_result = await db.execute(select(AuctionConfig).where(AuctionConfig.rfq_id == rfq.id))
    config = config_result.scalar_one_or_none()

    # Maybe extend
    extended = await _maybe_extend_auction(
        rfq, config, db, current_user.id, 
        rank_changed=rank_changed, 
        l1_changed=l1_changed
    )

    bid_log = ActivityLog(
        rfq_id=rfq.id,
        event_type="bid_submitted",
        description=f"Supplier {current_user.email} submitted a bid (Total: ${bid.total_amount}).",
        triggered_by_supplier_id=current_user.id,
    )
    db.add(bid_log)

    await db.commit()
    await db.refresh(bid)
    await db.refresh(rfq)

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

    submitted_at = bid.submitted_at
    if submitted_at.tzinfo is None:
        submitted_at = submitted_at.replace(tzinfo=timezone.utc)
    current_bid_close_time = rfq.current_bid_close_time
    if current_bid_close_time.tzinfo is None:
        current_bid_close_time = current_bid_close_time.replace(tzinfo=timezone.utc)

    message = {
        "event": "new_bid",
        "bid": {
            "id": str(bid.id),
            "rfq_id": str(bid.rfq_id),
            "supplier_id": str(bid.supplier_id),
            "total_amount": float(bid.total_amount),
            "rank": bid.rank,
            "submitted_at": submitted_at.isoformat().replace('+00:00', 'Z'),
        },
        "ranks": ranks,
        "current_bid_close_time": current_bid_close_time.isoformat().replace('+00:00', 'Z'),
        "extended": extended,
    }
    await manager.broadcast(str(rfq.id), message)
    await manager.broadcast(rfq.reference_id, message)
    return _build_bid_response(bid)


@router.get("/bids/{rfq_id}", response_model=list[BidResponse])
async def list_bids(rfq_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rfq = await _get_rfq_by_identifier(rfq_id, db)
    if not rfq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFQ not found")

    result = await db.execute(select(Bid).where(Bid.rfq_id == rfq.id).order_by(Bid.total_amount.asc(), Bid.submitted_at.asc()))
    bids = result.scalars().all()
    return [_build_bid_response(bid) for bid in bids]
