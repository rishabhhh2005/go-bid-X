import pytest
import pytest_asyncio
import uuid
from datetime import datetime, timedelta, timezone
from app.models.user import User
from app.models.rfq import RFQ
from app.models.auction_config import AuctionConfig
from app.models.bid import Bid
from app.auth import get_current_user
from app.main import app

@pytest.fixture
def override_user(client):
    supplier_id = uuid.uuid4()
    mock_supplier = User(
        id=supplier_id,
        email=f"supplier_{supplier_id}@test.com",
        full_name="Supplier Test",
        hashed_password="fake",
        role="supplier"
    )
    
    def _override():
        return mock_supplier

    app.dependency_overrides[get_current_user] = _override
    return mock_supplier

@pytest_asyncio.fixture
async def setup_rfq(db_session, override_user):
    buyer_id = uuid.uuid4()
    buyer = User(
        id=buyer_id,
        email=f"buyer_{buyer_id}@test.com",
        full_name="Buyer Test",
        hashed_password="fake",
        role="buyer"
    )
    db_session.add(buyer)
    
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    rfq = RFQ(
        id=uuid.uuid4(),
        reference_id=f"RFQ-TEST-{uuid.uuid4().hex[:8]}",
        name="Test RFQ",
        buyer_id=buyer.id,
        bid_start_time=now - timedelta(minutes=5),
        bid_close_time=now + timedelta(minutes=10),
        current_bid_close_time=now + timedelta(minutes=10),
        forced_bid_close_time=now + timedelta(minutes=20),
        is_british_auction=True,
        status="active"
    )
    db_session.add(rfq)
    
    config = AuctionConfig(
        id=uuid.uuid4(),
        rfq_id=rfq.id,
        trigger_window_minutes=5,
        extension_duration_minutes=5,
        max_extensions=2,
        extension_trigger_type="bid_received"
    )
    db_session.add(config)
    await db_session.commit()
    return rfq

@pytest.mark.asyncio
async def test_valid_bid_lowers_rank(client, setup_rfq, override_user, db_session):
    # Setup another supplier and an initial bid
    supplier2_id = uuid.uuid4()
    supplier2 = User(
        id=supplier2_id,
        email=f"supplier_{supplier2_id}@test.com",
        full_name="Supplier 2",
        hashed_password="fake",
        role="supplier"
    )
    db_session.add(supplier2)
    
    bid1 = Bid(
        id=uuid.uuid4(),
        rfq_id=setup_rfq.id,
        supplier_id=supplier2.id,
        carrier_name="Carrier 2",
        freight_charges=100.0,
        origin_charges=0.0,
        destination_charges=0.0,
        total_amount=100.0,
        rank=1,
        is_active=True
    )
    db_session.add(bid1)
    await db_session.commit()
    
    # Supplier 1 makes a lower bid
    payload = {
        "rfq_id": str(setup_rfq.id),
        "carrier_name": "Carrier 1",
        "freight_charges": 90.0,
        "origin_charges": 0.0,
        "destination_charges": 0.0,
        "total_amount": 90.0
    }
    
    response = client.post("/bid", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["rank"] == 1
    
    # Check that supplier 2 is now rank 2
    from sqlalchemy import select
    result = await db_session.execute(select(Bid).where(Bid.id == bid1.id))
    b1_updated = result.scalar_one()
    assert b1_updated.rank == 2

@pytest.mark.asyncio
async def test_extension_triggers_correctly(client, setup_rfq, override_user, db_session):
    # Move the current close time to within the trigger window (5 minutes)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    setup_rfq.current_bid_close_time = now + timedelta(minutes=3)
    await db_session.commit()
    
    initial_close_time = setup_rfq.current_bid_close_time
    
    payload = {
        "rfq_id": str(setup_rfq.id),
        "carrier_name": "Carrier 1",
        "freight_charges": 90.0,
        "origin_charges": 0.0,
        "destination_charges": 0.0,
        "total_amount": 90.0
    }
    response = client.post("/bid", json=payload)
    assert response.status_code == 200
    
    # Check extension
    await db_session.refresh(setup_rfq)
    assert setup_rfq.current_bid_close_time > initial_close_time
    # It should have extended by 5 minutes
    assert setup_rfq.current_bid_close_time == initial_close_time + timedelta(minutes=5)

@pytest.mark.asyncio
async def test_forced_close_cap_respected(client, setup_rfq, override_user, db_session):
    # Set current close time to just before forced close time
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    setup_rfq.forced_bid_close_time = now + timedelta(minutes=6)
    setup_rfq.current_bid_close_time = now + timedelta(minutes=4)
    # trigger window is 5m, so this is within window. Extension is 5m.
    # New close time would be 4 + 5 = 9m, which is > forced_close_time (6m).
    # So new close time should be clamped to forced_bid_close_time.
    await db_session.commit()
    
    payload = {
        "rfq_id": str(setup_rfq.id),
        "carrier_name": "Carrier 1",
        "freight_charges": 90.0,
        "origin_charges": 0.0,
        "destination_charges": 0.0,
        "total_amount": 90.0
    }
    response = client.post("/bid", json=payload)
    assert response.status_code == 200
    
    await db_session.refresh(setup_rfq)
    assert setup_rfq.current_bid_close_time == setup_rfq.forced_bid_close_time

@pytest.mark.asyncio
async def test_supplier_cant_bid_higher_than_current(client, setup_rfq, override_user, db_session):
    # Give the supplier an existing bid of 100
    bid1 = Bid(
        id=uuid.uuid4(),
        rfq_id=setup_rfq.id,
        supplier_id=override_user.id,
        carrier_name="Carrier 1",
        freight_charges=100.0,
        origin_charges=0.0,
        destination_charges=0.0,
        total_amount=100.0,
        rank=1,
        is_active=True
    )
    db_session.add(bid1)
    await db_session.commit()
    
    # Try to bid 110
    payload = {
        "rfq_id": str(setup_rfq.id),
        "carrier_name": "Carrier 1",
        "freight_charges": 110.0,
        "origin_charges": 0.0,
        "destination_charges": 0.0,
        "total_amount": 110.0
    }
    response = client.post("/bid", json=payload)
    assert response.status_code == 400
    assert "You already have a lower or equal bid" in response.json()["detail"]
