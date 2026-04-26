# GoBidX Backend Testing Guide

---

## 1) Register Buyer

**Route:** `POST /register`

**Body:**

```json
{
  "email": "buyer@example.com",
  "password": "strongpassword",
  "full_name": "Buyer Name",
  "role": "buyer",
  "company_name": "BuyerCo"
}
```

---

## 2) Register Supplier

**Route:** `POST /register`

**Body:**

```json
{
  "email": "supplier@example.com",
  "password": "strongpassword",
  "full_name": "Supplier Name",
  "role": "supplier",
  "company_name": "SupplierCo"
}
```

---

## 3) Login

**Route:** `POST /login`

**Body:**

```json
{
  "email": "buyer@example.com",
  "password": "strongpassword"
}
```

Copy the `access_token` from the response.

---

## 4) Get Current User

**Route:** `GET /me`
**Token:** `Authorization: Bearer <access_token>`

---

## 5) Create RFQ (Buyer Only)

**Route:** `POST /rfq`
**Token:** Required (Buyer)

**Body:**

```json
{
  "reference_id": "RFQ-1001",
  "name": "Route 1 shipment",
  "bid_start_time": "2026-04-24T22:34:44",
  "bid_close_time": "2026-04-24T22:49:44",
  "forced_bid_close_time": "2026-04-24T23:04:44",
  "pickup_service_date": "2026-04-25T00:00:00",
  "is_british_auction": false,
  "auction_config": {
    "trigger_window_minutes": 5,
    "extension_duration_minutes": 5,
    "extension_trigger_type": "bid_received",
    "max_extensions": 3
  }
}
```

Copy the `rfq_id` from the response.

---

## 6) Get RFQ

**Route:** `GET /rfq/{rfq_id}`
**Token:** Required

---

## 7) Place Bid (Supplier Only)

**Route:** `POST /bid`
**Token:** Required (Supplier)

**Body:**

```json
{
  "rfq_id": "PASTE_RFQ_ID_HERE",
  "carrier_name": "Gocommet",
  "freight_charges": 1000,
  "origin_charges": 50,
  "destination_charges": 25,
  "total_amount": 1075,
  "transit_time_days": 3,
  "quote_validity_date": "2026-04-30T00:00:00"
}
```

---

## 8) Get Bids

**Route:** `GET /bids/{rfq_id}`
**Token:** Required

Returns all bids sorted by `total_amount` in ascending order (lowest bid first).

---

## 9) Get RFQ Activity Log

**Route:** `GET /rfq/{rfq_id}/activity`
**Token:** Required

Returns a history of all events related to the RFQ, including creation, activation (now logged as `auction_activated`), bids, extensions, and closing.



---

## 10) Delete RFQ (Cleanup)

**Route:** `DELETE /rfq/{rfq_id}`
**Token:** Buyer only

Only the RFQ creator is allowed to delete it.

---

## 11) Background Status Scheduler

The backend now includes a background task that polls for and closes expired RFQs every minute. You don't need to manually trigger a status refresh via HTTP requests anymore; the state will transition automatically in the background and broadcast via WebSockets.

---

## Successful Flow

```
Register → Login → Create RFQ → Place Bid → Get Bids → Ranking
```

---

## Important Notes

* Use **supplier token** for placing bids
* Use **buyer token** for creating RFQs
* Ensure:

  ```
  bid_start_time < bid_close_time < forced_bid_close_time
  ```
* Always perform actions within the active bidding window

---

## Completion

If all the above steps work correctly, the backend is fully functional.

WebSocket integration is fully implemented, providing real-time bid board updates and RFQ status changes to connected clients.
