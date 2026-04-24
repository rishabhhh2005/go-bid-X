from sqlalchemy import Column, Integer, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.database import Base


class AuctionConfig(Base):
    __tablename__ = "auction_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    rfq_id = Column(UUID(as_uuid=True), ForeignKey("rfqs.id"), nullable=False, unique=True)

    # X minutes before close when trigger activates
    trigger_window_minutes = Column(Integer, nullable=False)

    # Y minutes to extend
    extension_duration_minutes = Column(Integer, nullable=False)

    # When extension should trigger
    extension_trigger_type = Column(
        Enum(
            "bid_received",
            "any_rank_change",
            "l1_rank_change",
            name="extension_trigger_type"
        ),
        nullable=False
    )

    # Optional safety limit
    max_extensions = Column(Integer, default=999)