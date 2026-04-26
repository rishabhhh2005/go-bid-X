# GoBidX - British Auction RFQ System

GoBidX is a simplified RFQ (Request for Quotation) system supporting British Auction-style bidding with automatic time extensions and forced close rules.

## Features
- **RFQ Creation**: Buyers can create RFQs with standard or British Auction settings.
- **British Auction Logic**:
    - **Trigger Window (X)**: Monitoring activity near the end of the auction.
    - **Extension Duration (Y)**: Automatically adding time when triggers occur.
    - **Trigger Types**: Bid Received, Any Rank Change, or L1 Rank Change.
- **Forced Close**: A hard limit that the auction can never exceed.
- **Real-time Updates**: Live bid board and activity logs powered by WebSockets.
- **Supplier Ranking**: Automatic L1, L2, L3... calculation.
- **Background Scheduler**: Automatic polling and closing of expired auctions.
- **Safety Extension Limits**: Support for `max_extensions` to prevent excessive bidding loops.

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, Axios.
- **Backend**: FastAPI, SQLAlchemy (Async), PostgreSQL (Neon), WebSockets.
- **Authentication**: JWT-based auth.

## Prerequisites
- Node.js (v18+)
- Python (3.10+)
- PostgreSQL (or use the provided Neon database in `.env`)

## Setup Instructions

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
# Database is already configured in .env
# To run migrations:
alembic upgrade head
# Start the server:
uvicorn app.main:app --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## How to Test the British Auction
1. **Create Buyer**: Register as a "Buyer".
2. **Create RFQ**: Go to "Create RFQ", set the start time to current time, and enable "British Auction".
3. **Create Suppliers**: Open a new browser or incognito window and register as a "Supplier" (create at least 2).
4. **Place Bids**: 
   - As a supplier, find the RFQ and place a bid.
   - Wait until the time is within the "Trigger Window" (e.g., if close is 6:00 PM and window is 10 mins, wait until 5:50 PM).
   - Place another bid or have a different supplier underbid the first one.
   - Observe the "Current Close Time" extending on the detail page and the "Activity Log" recording the reason.
5. **Forced Close**: Observe that no matter how many extensions occur, the auction will never go past the "Forced Bid Close Time".

## License
MIT
