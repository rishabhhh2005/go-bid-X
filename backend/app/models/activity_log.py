from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from app.database import Base


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    rfq_id = Column(UUID(as_uuid=True), ForeignKey("rfqs.id", ondelete="CASCADE"), nullable=False)

    event_type = Column(
        Enum(
            "bid_submitted",
            "auction_activated",
            "time_extended",
            "auction_closed",
            "auction_force_closed",
            name="activity_event_type"
        ),
        nullable=False
    )

    description = Column(Text, nullable=False)

    extension_reason = Column(String(255), nullable=True)

    new_close_time = Column(DateTime, nullable=True)

    triggered_by_supplier_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)