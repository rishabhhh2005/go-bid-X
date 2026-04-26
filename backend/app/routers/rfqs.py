from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.auction_config import AuctionConfig
from app.models.rfq import RFQ
from app.models.activity_log import ActivityLog
from app.models.bid import Bid
from app.schemas.rfq import AuctionConfigCreate, RFQCreate, RFQResponse
from app.auth import get_current_user
from app.models.user import User
from sqlalchemy import delete, desc
from app.routers.ws import manager

router = APIRouter()


from typing import Optional


def _normalize_datetime(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        # Assume naive datetime is already UTC if it comes from the DB
        return value.replace(tzinfo=None)
    # Convert to UTC and strip tzinfo for database storage
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
        "current_lowest_bid": rfq.current_lowest_bid if hasattr(rfq, "current_lowest_bid") else None,
        "auction_config": config,
    }


async def _refresh_rfq_status(rfq: RFQ, db: AsyncSession) -> None:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    bid_start = _normalize_datetime(rfq.bid_start_time)
    bid_close = _normalize_datetime(rfq.current_bid_close_time)
    
    updated = False
    if rfq.status == "draft" and now >= bid_start and now < bid_close:
        rfq.status = "active"
        updated = True
        log = ActivityLog(
            rfq_id=rfq.id,
            event_type="auction_activated",
            description="RFQ moved from draft to active status.",
        )
        db.add(log)
    elif rfq.status == "active" and now >= bid_close:
        forced_close = _normalize_datetime(rfq.forced_bid_close_time)
        if bid_close >= forced_close:
            rfq.status = "force_closed"
            description = "Auction reached its forced close time limit."
        else:
            rfq.status = "closed"
            description = "Auction closed because current close time was reached."
            
        updated = True
        log = ActivityLog(
            rfq_id=rfq.id,
            event_type="auction_closed",
            description=description,
            new_close_time=rfq.current_bid_close_time,
        )
        db.add(log)
    
    if updated:
        await db.commit()
        await db.refresh(rfq)

        # Broadcast status change
        message = {
            "event": "status_changed",
            "rfq_id": str(rfq.id),
            "status": rfq.status,
            "current_bid_close_time": rfq.current_bid_close_time.isoformat() + "Z" if rfq.current_bid_close_time.tzinfo is None else rfq.current_bid_close_time.isoformat(),
        }
        await manager.broadcast(str(rfq.id), message)
        await manager.broadcast(rfq.reference_id, message)

async def _close_rfq_if_expired(rfq: RFQ, db: AsyncSession) -> None:
    await _refresh_rfq_status(rfq, db)


@router.post("/rfq", response_model=RFQResponse)
async def create_rfq(rfq_in: RFQCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.role != "buyer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only buyers can create RFQs")

    bid_start_time = _normalize_datetime(rfq_in.bid_start_time)
    bid_close_time = _normalize_datetime(rfq_in.bid_close_time)
    forced_bid_close_time = _normalize_datetime(rfq_in.forced_bid_close_time)
    current_time = datetime.now(timezone.utc).replace(tzinfo=None)

    if bid_close_time <= bid_start_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="bid_close_time must be after bid_start_time")
    if forced_bid_close_time <= bid_close_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="forced_bid_close_time must be later than bid_close_time")

    pickup_service_date = _normalize_datetime(rfq_in.pickup_service_date)
    
    # Determine initial status
    initial_status = "draft"
    if bid_start_time <= current_time < bid_close_time:
        initial_status = "active"
    elif current_time >= bid_close_time:
        initial_status = "closed"

    # Check if reference_id already exists to give a better error message
    existing_rfq = await db.execute(select(RFQ).where(RFQ.reference_id == rfq_in.reference_id))
    if existing_rfq.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"RFQ with Reference ID '{rfq_in.reference_id}' already exists."
        )

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
        status=initial_status,
    )
    db.add(rfq)
    await db.flush() # flush to get rfq.id
    
    config = None
    if rfq.is_british_auction:
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
    
    return build_rfq_response(rfq, config)


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


@router.get("/rfq/{rfq_id}", response_model=RFQResponse)
async def read_rfq(rfq_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rfq = await _get_rfq_by_identifier(rfq_id, db)
    if not rfq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFQ not found")

    await _close_rfq_if_expired(rfq, db)

    config_result = await db.execute(select(AuctionConfig).where(AuctionConfig.rfq_id == rfq.id))
    config = config_result.scalar_one_or_none()
    
    # Fetch lowest bid
    bid_result = await db.execute(
        select(Bid).where(Bid.rfq_id == rfq.id, Bid.is_active == True).order_by(Bid.total_amount.asc()).limit(1)
    )
    lowest_bid = bid_result.scalar_one_or_none()
    rfq.current_lowest_bid = float(lowest_bid.total_amount) if lowest_bid else None

    return build_rfq_response(rfq, config)


@router.get("/rfq", response_model=list[RFQResponse])
async def list_rfqs(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):

    # Get all RFQs with their auction_config in ONE query (selectinload)
    result = await db.execute(
        select(RFQ)
        .options(selectinload(RFQ.auction_config))
        .order_by(desc(RFQ.created_at))
    )
    rfqs = result.scalars().all()
    
    # Get lowest bids for ALL rfqs in ONE query
    subq = (
        select(Bid.rfq_id, func.min(Bid.total_amount).label("min_bid"))
        .where(Bid.is_active == True)
        .group_by(Bid.rfq_id)
        .subquery()
    )
    bid_result = await db.execute(select(subq))
    lowest_bids = {row.rfq_id: row.min_bid for row in bid_result}

    responses = []
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    for rfq in rfqs:
        # Compute effective status for the response without necessarily writing to DB
        # This fixes the dashboard showing 'draft' when it should be 'active'
        effective_status = rfq.status
        bid_start = _normalize_datetime(rfq.bid_start_time)
        bid_close = _normalize_datetime(rfq.current_bid_close_time)
        
        if rfq.status == "draft" and now >= bid_start and now < bid_close:
            effective_status = "active"
        elif rfq.status == "active" and now >= bid_close:
            effective_status = "closed"
            
        rfq.current_lowest_bid = float(lowest_bids[rfq.id]) if rfq.id in lowest_bids else None
        
        # Build response with effective status
        response_data = build_rfq_response(rfq, getattr(rfq, 'auction_config', None))
        response_data["status"] = effective_status
        responses.append(response_data)
            
    return responses


@router.delete("/rfq/{rfq_id}", status_code=204)
async def delete_rfq(rfq_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.role != "buyer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only buyers can delete RFQs")

    rfq = await _get_rfq_by_identifier(rfq_id, db)
    if not rfq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFQ not found")

    if rfq.buyer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own RFQs")

    await db.execute(delete(ActivityLog).where(ActivityLog.rfq_id == rfq.id))
    await db.execute(delete(Bid).where(Bid.rfq_id == rfq.id))
    await db.execute(delete(AuctionConfig).where(AuctionConfig.rfq_id == rfq.id))
    await db.execute(delete(RFQ).where(RFQ.id == rfq.id))

    await db.commit()

@router.get("/rfq/{rfq_id}/activity", response_model=list[dict])
async def list_rfq_activity(rfq_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rfq = await _get_rfq_by_identifier(rfq_id, db)
    if not rfq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFQ not found")

    result = await db.execute(
        select(ActivityLog)
        .where(ActivityLog.rfq_id == rfq.id)
        .order_by(desc(ActivityLog.created_at))
    )
    logs = result.scalars().all()
    return [
        {
            "id": str(log.id),
            "event_type": log.event_type,
            "description": log.description,
            "extension_reason": log.extension_reason,
            "new_close_time": log.new_close_time.isoformat() + "Z" if log.new_close_time else None,
            "triggered_by_supplier_id": str(log.triggered_by_supplier_id) if log.triggered_by_supplier_id else None,
            "created_at": log.created_at.isoformat() + "Z",
        }
        for log in logs
    ]
