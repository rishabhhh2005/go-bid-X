# GoBidX - British Auction RFQ Platform

**GoBidX** is a modern, full-stack Request for Quotation (RFQ) platform tailored for the logistics and freight industry. It features a robust **British Auction** module that allows dynamic time extensions based on real-time bidding activity, ensuring buyers get the best possible rates while maintaining strict forced closure limits.

---

## 🌟 Key Features

### 🏢 Multi-Role Access
- **Buyers**: Create RFQs, configure British Auction rules, and monitor live bids and rankings.
- **Suppliers**: Discover active RFQs, submit freight quotes, and compete in real-time to achieve L1 rank.

### ⏱️ Advanced British Auction Engine
- **Dynamic Extensions**: Automatically extends the auction closing time if bids are received near the deadline.
- **Configurable Triggers**: Buyers can set extensions to trigger on *any bid*, *any rank change*, or *only L1 rank changes*.
- **Safety Limits**: Built-in maximum extension counts (`max_extensions`) and hard `forced_bid_close_time` guarantees auctions will always conclude.

### 📊 Real-Time Bidding & Ranking
- Dynamic calculation of supplier rankings (L1, L2, L3) based on total bid amounts.
- Comprehensive audit trails via the **Activity Log**, recording all bids, extensions, and automated closures.

### ⚙️ Automated Background Processing
- A background scheduler continuously polls the database, automatically moving expired RFQs to `closed` or `force_closed` states without requiring manual intervention.

---

## 🛠️ Technology Stack

**Frontend:**
- React 18 & Vite
- Tailwind CSS (for modern, responsive styling)
- Context API (for state management)
- React Router DOM

**Backend:**
- FastAPI (High-performance Python web framework)
- SQLAlchemy (ORM) & PostgreSQL (Neon Serverless DB)
- Alembic (Database Migrations)
- JWT (JSON Web Tokens) for secure authentication
- APScheduler (for background task execution)

---

## 📂 Project Structure

```text
GoBidX/
├── backend/                  # FastAPI Application
│   ├── app/                  
│   │   ├── models/           # SQLAlchemy Database Models
│   │   ├── routers/          # API Route Definitions
│   │   ├── schemas/          # Pydantic validation schemas
│   │   ├── database.py       # DB connection & session management
│   │   ├── main.py           # Application entry point & scheduler
│   │   └── security.py       # JWT and Password Hashing
│   ├── alembic/              # Migration Scripts
│   └── requirements.txt      # Python dependencies
├── frontend/                 # React Application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── context/          # Global state (AuthContext)
│   │   ├── pages/            # Page-level components
│   │   ├── services/         # API integration (Axios)
│   │   └── App.jsx           # Root layout and routing
│   ├── package.json          # Node dependencies
│   └── tailwind.config.js    # Tailwind theme configuration
├── Full_Schema_Design.md     # Detailed Database Schema Design
├── HLD.png                   # High-Level Design Diagram
├── Schema_Design.png         # Schema Design Image
└── README.md                 # Project Documentation
```

---

## 🗄️ Database Schema Design

A comprehensive and Git-friendly breakdown of the database schema (Users, RFQs, Auction Configs, Bids, and Activity Logs) is available in the root directory. 

👉 **[View Full Schema Design Here](./Full_Schema_Design.md)**

---

## 🚀 Setup Instructions

### 1. Prerequisites
- **Node.js** (v18+ recommended)
- **Python** (3.10+ recommended)
- **PostgreSQL** (A remote Neon Postgres URL is pre-configured in `.env` for convenience)

### 2. Backend Setup
Navigate to the `backend` directory and set up the Python environment:

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# On Windows:
venv\Scripts\activate
# On Mac/Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations (Ensure .env is populated with DATABASE_URL)
alembic upgrade head

# Start the FastAPI server
uvicorn app.main:app --reload
```
The backend will run at `http://localhost:8000`. You can view the interactive API documentation at `http://localhost:8000/docs`.

### 3. Frontend Setup
Open a new terminal window, navigate to the `frontend` directory, and install dependencies:

```bash
cd frontend

# Install Node modules
npm install

# Start the Vite development server
npm run dev
```
The frontend will run at `http://localhost:5173`.

---

## 🧪 How to Test the Application

1. **User Registration**:
   - Register one user as a **Buyer**.
   - Open an incognito window and register at least two users as **Suppliers**.
2. **Create an RFQ**:
   - Log in as the Buyer, click **Create RFQ**, and enable the **British Auction** toggle.
   - Set a close time roughly 5-10 minutes in the future.
   - Configure the trigger window (e.g., 5 mins) and extension duration (e.g., 5 mins).
3. **Simulate Bidding**:
   - Log in as Supplier A and place a bid.
   - Wait until the current time falls within the *Trigger Window*.
   - Log in as Supplier B and place a lower bid to trigger an L1 rank change.
4. **Observe the Automation**:
   - Return to the Buyer's dashboard. You will see the `current_bid_close_time` automatically extended, and an entry added to the Activity Log explaining the extension reason.
   - Wait for the time to expire; observe the system automatically marking the RFQ as `closed`.

---

## Made by Rishabh Puri
