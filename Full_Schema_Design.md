# Full Schema Design - GoBidX

The GoBidX platform utilizes a robust relational database schema to manage Request for Quotations (RFQs), British Auctions, Bids, Users, and Activity Logs. Below is the full schema design in a Git-friendly Markdown format.

## Entity Relationship Summary

- **Users** can be either `buyers` or `suppliers`.
- **Buyers** create **RFQs** (1 to Many).
- Each **RFQ** has exactly one **AuctionConfig** (1 to 1) if it's a British auction.
- **Suppliers** submit **Bids** for **RFQs** (Many to 1).
- Each **RFQ** tracks events through **ActivityLogs** (1 to Many).

---

## 1. Users Table (`users`)

Manages all system users, differentiating them by their `role`.

| Column Name | Data Type | Constraints | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | `uuid.uuid4()` | Unique identifier for the user |
| `email` | String(255) | UNIQUE, NOT NULL, INDEX | | User's email address (used for login) |
| `hashed_password` | String(255) | NOT NULL | | Bcrypt hashed password |
| `full_name` | String(255) | NOT NULL | | User's full name |
| `role` | Enum | NOT NULL | | `"buyer"` or `"supplier"` |
| `company_name` | String(255) | NULLABLE | | The company the user represents |
| `is_active` | Boolean | | `True` | Soft delete / activation flag |
| `created_at` | DateTime | | `datetime.utcnow` | Timestamp of account creation |

---

## 2. RFQs Table (`rfqs`)

Stores Request for Quotations and tracks the overall state of the auction.

| Column Name | Data Type | Constraints | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | `uuid.uuid4()` | Unique identifier for the RFQ |
| `reference_id` | String(50) | UNIQUE, NOT NULL | | Human-readable reference ID |
| `name` | String(255) | NOT NULL | | Title or name of the RFQ |
| `buyer_id` | UUID | FOREIGN KEY (`users.id`), NOT NULL| | The buyer who created the RFQ |
| `bid_start_time` | DateTime | NOT NULL | | When the bidding officially starts |
| `bid_close_time` | DateTime | NOT NULL | | The original, planned closing time |
| `current_bid_close_time`| DateTime | NOT NULL | | Dynamically changes when extensions trigger |
| `forced_bid_close_time` | DateTime | NOT NULL | | Absolute hard limit for extensions |
| `pickup_service_date` | DateTime | NULLABLE | | Expected date for service pickup |
| `is_british_auction` | Boolean | | `False` | Flags if the RFQ uses dynamic extensions |
| `status` | Enum | | `"draft"` | `"draft"`, `"active"`, `"closed"`, `"force_closed"` |
| `created_at` | DateTime | | `datetime.utcnow` | Timestamp of RFQ creation |

---

## 3. Auction Configs Table (`auction_configs`)

Stores the dynamic extension rules for British Auctions.

| Column Name | Data Type | Constraints | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | `uuid.uuid4()` | Unique identifier for the config |
| `rfq_id` | UUID | FOREIGN KEY (`rfqs.id`), UNIQUE, NOT NULL| | RFQ this config belongs to (ON DELETE CASCADE) |
| `trigger_window_minutes`| Integer | NOT NULL | | X minutes before close when trigger activates |
| `extension_duration_minutes`| Integer | NOT NULL | | Y minutes added to `current_bid_close_time` |
| `extension_trigger_type`| Enum | NOT NULL | | `"bid_received"`, `"any_rank_change"`, `"l1_rank_change"` |
| `max_extensions` | Integer | | `999` | Safety limit on how many times an auction extends |

---

## 4. Bids Table (`bids`)

Stores supplier quotes for specific RFQs. Contains cost breakdowns and rank.

| Column Name | Data Type | Constraints | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | `uuid.uuid4()` | Unique identifier for the bid |
| `rfq_id` | UUID | FOREIGN KEY (`rfqs.id`), NOT NULL| | RFQ this bid targets (ON DELETE CASCADE) |
| `supplier_id` | UUID | FOREIGN KEY (`users.id`), NOT NULL| | The supplier placing the bid |
| `carrier_name` | String(255) | NOT NULL | | Name of the carrier providing service |
| `freight_charges` | Numeric | NOT NULL | | Main freight cost |
| `origin_charges` | Numeric | | `0` | Origin handling charges |
| `destination_charges` | Numeric | | `0` | Destination handling charges |
| `total_amount` | Numeric | NOT NULL | | Calculated total (`freight` + `origin` + `destination`) |
| `transit_time_days` | Integer | NULLABLE | | Number of days for transit |
| `quote_validity_date` | DateTime | NULLABLE | | Validity expiration for the quote |
| `rank` | Integer | NULLABLE | | Calculated rank (L1, L2, L3, etc.) |
| `is_active` | Boolean | | `True` | Flags if this is the supplier's latest active bid |
| `submitted_at` | DateTime | | `datetime.utcnow` | Timestamp of bid submission |

---

## 5. Activity Logs Table (`activity_logs`)

Audit trail for tracking critical RFQ events like extensions, closures, and bids.

| Column Name | Data Type | Constraints | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY | `uuid.uuid4()` | Unique identifier for the log entry |
| `rfq_id` | UUID | FOREIGN KEY (`rfqs.id`), NOT NULL| | RFQ this event belongs to (ON DELETE CASCADE) |
| `event_type` | Enum | NOT NULL | | Event type: `"bid_submitted"`, `"auction_activated"`, `"time_extended"`, `"auction_closed"`, `"auction_force_closed"` |
| `description` | Text | NOT NULL | | Detailed description of the event |
| `extension_reason` | String(255) | NULLABLE | | Reason why an extension was triggered |
| `new_close_time` | DateTime | NULLABLE | | The updated `current_bid_close_time` after extension |
| `triggered_by_supplier_id`| UUID | FOREIGN KEY (`users.id`), NULLABLE| | Supplier who caused the event (e.g., placing L1 bid) |
| `created_at` | DateTime | | `datetime.utcnow` | Timestamp of the event |
