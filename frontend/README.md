# GoBidX Frontend

This is the frontend application for **GoBidX**, a modern, full-stack Request for Quotation (RFQ) platform featuring a British Auction module.

## 🚀 Technology Stack

- **React 18**: Frontend library for building user interfaces.
- **Vite**: Next-generation frontend tooling for fast development and building.
- **Tailwind CSS**: Utility-first CSS framework for rapid and responsive styling.
- **React Router DOM**: Client-side routing.
- **Context API**: Global state management (Authentication).
- **WebSockets**: Native browser WebSockets for real-time live bid board updates and dynamic auction extensions.

## ✨ Key Features

- **Role-Based Dashboards**: Distinct interfaces for `buyers` (RFQ creation and monitoring) and `suppliers` (bidding and live ranking).
- **Live Bid Board**: Real-time WebSocket connection displaying active bids and automated RFQ status updates without requiring a page refresh.
- **Dynamic Auction Notifications**: Visual cues and alerts when an auction is automatically extended or falls within the trigger window limit.
- **Responsive Design**: Fully optimized for desktop and mobile displays using modern design aesthetics and Tailwind CSS.

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v18+ recommended)
- The GoBidX Backend server running locally or remotely.

### Installation

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env` file in the root of the `frontend` directory (you can use `.env.example` as a reference):
   ```env
   VITE_API_URL=http://localhost:8000
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The application will be accessible at `http://localhost:5173`.

## 📦 Building for Production

To create an optimized production build:

```bash
npm run build
```

This will generate the minified bundle in the `dist` folder, which can be deployed to Vercel, Netlify, AWS S3, or any other static hosting service.
