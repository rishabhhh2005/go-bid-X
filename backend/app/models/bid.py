from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Integer, Numeric
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from app.database import Base


class Bid(Base):
    __tablename__ = "bids"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    rfq_id = Column(UUID(as_uuid=True), ForeignKey("rfqs.id"), nullable=False)

    supplier_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    carrier_name = Column(String(255), nullable=False)

    freight_charges = Column(Numeric, nullable=False)

    origin_charges = Column(Numeric, default=0)
    destination_charges = Column(Numeric, default=0)

    total_amount = Column(Numeric, nullable=False)

    transit_time_days = Column(Integer, nullable=True)

    quote_validity_date = Column(DateTime, nullable=True)

    # Ranking (L1, L2, etc.)
    rank = Column(Integer, nullable=True)

    # Only latest bid from supplier should be active
    is_active = Column(Boolean, default=True)

    submitted_at = Column(DateTime, default=datetime.utcnow)