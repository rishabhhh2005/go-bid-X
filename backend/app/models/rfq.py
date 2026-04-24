from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Enum
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from app.database import Base


class RFQ(Base):
    __tablename__ = "rfqs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    reference_id = Column(String(50), unique=True, nullable=False)

    name = Column(String(255), nullable=False)

    buyer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    bid_start_time = Column(DateTime, nullable=False)
    bid_close_time = Column(DateTime, nullable=False)

    # This will change when auction extends
    current_bid_close_time = Column(DateTime, nullable=False)

    # Hard limit — cannot exceed this
    forced_bid_close_time = Column(DateTime, nullable=False)

    pickup_service_date = Column(DateTime, nullable=True)

    is_british_auction = Column(Boolean, default=False)

    status = Column(
        Enum("draft", "active", "closed", "force_closed", name="rfq_status"),
        default="draft"
    )

    created_at = Column(DateTime, default=datetime.utcnow)