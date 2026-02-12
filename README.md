# 🚀 Centralized Exchange (CEX)

A production-grade, event-driven cryptocurrency exchange built with scalable architecture, low-latency matching engine, and real-time market data streaming.

Designed with separation of concerns, high throughput, crash recovery, and financial consistency in mind.

---

## 🧱 Architecture

This exchange follows an **event-driven microservices architecture** powered by Kafka.

![Architecture](./images/architecture.png)

---

## 🧠 Core Design Principles

- ⚡ Low latency in-memory matching engine
- 📦 Event-driven architecture (Kafka backbone)
- 🔁 Idempotent & replayable event processing
- 💰 Financial consistency via transactional settlement
- 📊 Real-time candle generation
- 🔌 WebSocket-based live market updates
- 🛡 Crash recovery using Redis snapshots
- 📈 Horizontally scalable per market

---

## 🛠 Tech Stack

### Monorepo
- Turborepo

### Backend
- Node.js
- Express.js
- Kafka
- Redis

### Frontend
- Next.js
- TanStack Query
- Tailwind CSS

### Database
- PostgreSQL
- Prisma ORM

---

# 📦 Services Breakdown

## 1️⃣ Primary Server
- Authentication (OTP based)
- Deposit handling
- Market & candle fetching
- Proxies order requests to Trading API

---

## 2️⃣ Trading API
- Order validation
- Balance locking
- Writes order as `PENDING`
- Publishes:
  - `ORDER_CREATE`
  - `ORDER_CANCEL`

> No public access — internal only.

---

## 3️⃣ Matching Engine
- Consumes order events from Kafka
- Maintains in-memory orderbook per market
- Emits:
  - `ORDER_OPENED`
  - `ORDER_UPDATED`
  - `ORDER_CANCELLED`
  - `TRADE_EXECUTED`
- Stores periodic snapshot in Redis
- Recovers state on crash

⚡ Designed for high-speed execution.

---

## 4️⃣ Settlement Service
- Consumes execution events
- Updates:
  - Order states
  - Trades
  - Wallet balances
- Uses DB transactions for atomicity

💰 Database remains financial source of truth.

---

## 5️⃣ Order Lifecycle Worker
- Expires stale `PENDING` orders
- Emits `ORDER_EXPIRED`

---

## 6️⃣ Candle Aggregate Worker
- Listens to `TRADE_EXECUTED`
- Generates OHLC candles (multiple intervals)
- Stores in Redis
- Publishes via Redis PubSub

---

## 7️⃣ Candle Persist Worker
- Flushes Redis candles to PostgreSQL

---

## 8️⃣ WebSocket Gateway
- Maintains in-memory orderbook copy
- Listens to Redis PubSub
- Streams:
  - Orderbook updates
  - Trades
  - Candles
- Scales horizontally

---

# 🔄 Order Flow (Detailed)

1. Client places order
2. Trading API validates & locks funds
3. Order written as `PENDING`
4. `ORDER_CREATE` event published to Kafka
5. Matching engine processes event
6. If matched → emits `TRADE_EXECUTED`
7. Settlement updates DB atomically
8. WS gateway pushes real-time update

---

# 🧩 Event-Driven Design

### Why Kafka?

- Durable log storage
- Replay capability
- Partition ordering (per market)
- High throughput
- Decoupled services

Partition strategy: **by market**

Ensures strict order execution per trading pair.

---

# 🔐 Consistency Model

- Matching Engine → Execution authority
- Settlement → Financial authority
- Database → Balance & trade source of truth
- Kafka → Event source of truth

Model: **Eventual consistency with strong financial guarantees**

---

# 📊 Real-Time Features

- Live orderbook updates
- Real-time trade stream
- Multi-interval candle generation
- WebSocket broadcasting

---

# 🛡 Reliability & Fault Tolerance

- Idempotent consumers
- Unique constraints for trades & orders
- Redis orderbook snapshots
- Kafka replay for recovery
- DB transactions for atomic balance updates
- Outbox pattern for reliable event publishing

---

# 📈 Scalability Strategy

- Kafka partitioned by market
- Matching engine scalable per market
- WS gateway horizontally scalable
- Redis used for low-latency broadcasting
- Read replicas for heavy read queries

---

# 🧪 Future Improvements

- Move matching engine to Rust/Go for ultra-low latency
- Introduce ledger-based accounting
- Add risk engine
- Add advanced surveillance (wash trading detection)
- Horizontal DB sharding

---

# 🎯 Why This Project?

This project demonstrates:

- Advanced system design knowledge
- Event-driven architecture
- Financial transaction handling
- Distributed system thinking
- Real-time data streaming
- Fault tolerance & crash recovery
- Production-grade backend design

---

# ⭐ If you find this interesting, consider giving it a star!
