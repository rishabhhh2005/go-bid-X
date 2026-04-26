import pytest
import uuid
from datetime import datetime, timedelta, timezone

@pytest.mark.asyncio
async def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "running"}

@pytest.mark.asyncio
async def test_db_ping(client):
    response = client.get("/test-db")
    assert response.status_code == 200
    assert response.json() == {"db": "connected"}

@pytest.mark.asyncio
async def test_auth_flow(client):
    # 1. Register
    email = f"test_{uuid.uuid4().hex}@example.com"
    reg_payload = {
        "email": email,
        "password": "password123",
        "full_name": "Test User",
        "company_name": "Test Corp",
        "role": "buyer"
    }
    response = client.post("/register", json=reg_payload)
    assert response.status_code == 200
    
    # 2. Login
    login_payload = {
        "email": email,
        "password": "password123"
    }
    response = client.post("/login", json=login_payload) # Using JSON instead of form data
    assert response.status_code == 200
    token_data = response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_rfq_creation_flow(client, db_session):
    # 1. Register and Login to get token
    email = f"buyer_{uuid.uuid4().hex}@example.com"
    client.post("/register", json={
        "email": email,
        "password": "password123",
        "full_name": "Buyer One",
        "company_name": "Buyer Corp",
        "role": "buyer"
    })
    login_resp = client.post("/login", json={"email": email, "password": "password123"})
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create RFQ
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    rfq_payload = {
        "reference_id": f"REF-{uuid.uuid4().hex[:6]}",
        "name": "Market RFQ",
        "bid_start_time": (now - timedelta(minutes=1)).isoformat(),
        "bid_close_time": (now + timedelta(minutes=10)).isoformat(),
        "forced_bid_close_time": (now + timedelta(minutes=20)).isoformat(),
        "is_british_auction": False
    }
    
    response = client.post("/rfq", json=rfq_payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Market RFQ"
    assert data["status"] == "active"
    assert data["auction_config"] is None

    # 3. Create British RFQ
    british_payload = {
        "reference_id": f"REF-{uuid.uuid4().hex[:6]}",
        "name": "British Auction",
        "bid_start_time": (now - timedelta(minutes=1)).isoformat(),
        "bid_close_time": (now + timedelta(minutes=10)).isoformat(),
        "forced_bid_close_time": (now + timedelta(minutes=20)).isoformat(),
        "is_british_auction": True,
        "auction_config": {
            "trigger_window_minutes": 5,
            "extension_duration_minutes": 5,
            "extension_trigger_type": "bid_received"
        }
    }
    response = client.post("/rfq", json=british_payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["is_british_auction"] is True
    assert data["auction_config"]["trigger_window_minutes"] == 5

    # 4. List RFQs
    list_resp = client.get("/rfq", headers=headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 2
