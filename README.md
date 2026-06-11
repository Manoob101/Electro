# ElectroPOS

An open-source Point of Sale system built for electronics shops in Sri Lanka. Manage products, sales, warranties, inventory, and customers from any browser — including touch-screen POS terminals.

![License](https://img.shields.io/badge/license-MIT-blue) ![Node](https://img.shields.io/badge/node-%3E%3D18-green) ![React](https://img.shields.io/badge/react-18-blue)

---

## Features

- **Touch-Optimised POS** — Full-screen checkout designed for tablet/touchscreen registers. Category-tab product browser, large tap targets, always-visible on-screen numpad for cash/discount entry, instant tap-to-add product cards
- **Customer Management in POS** — Search existing customers or create a new one (name, phone, email, address) directly from the checkout screen without leaving the sale
- **Bill Printing** — Thermal printer-friendly 80 mm receipt with itemised products, warranty details, discount, invoice number, and change amount. Prints via the browser's native print dialog
- **Barcode Support** — Webcam barcode scanner, EAN-13 barcode generation, printable barcode labels
- **Warranty Management** — Auto-tracks warranty per item sold; search by serial number or invoice; process claims
- **Product Management** — Full CRUD, categories, suppliers, low-stock alerts
- **Inventory** — Stock adjustments (add / remove / set), full movement audit trail
- **Customer CRM** — Purchase history and active warranties per customer
- **Reports** — Daily/monthly sales charts, payment method breakdown, top products
- **User Management** — Admin and Cashier roles with per-user access control
- **Currency** — Sri Lankan Rupee (LKR) throughout

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Recharts |
| Backend | Node.js, Express.js |
| Database | SQLite (via Prisma ORM) — swappable with PostgreSQL/MySQL |
| Barcode Scan | @zxing/browser (webcam) |
| Barcode Print | JsBarcode (CODE128) |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Containerisation | Docker + Docker Compose |

---

## Getting Started

### Option A — Docker (recommended)

```bash
git clone https://github.com/Manoob101/Electro.git
cd Electro
docker compose up --build
```

- Frontend → http://localhost:3000
- Backend API → http://localhost:5000

The container automatically creates the database schema and seeds demo data on first run.

### Option B — Local development

**Prerequisites:** Node.js 18+, npm 9+

```bash
git clone https://github.com/Manoob101/Electro.git
cd Electro
```

**Backend:**
```bash
cd backend
npm install
npm run setup        # generates Prisma client, runs migrations, seeds demo data
npm run dev          # starts API server on http://localhost:5000
```

**Frontend** (new terminal):
```bash
cd frontend
npm install
npm run dev          # starts dev server on http://localhost:5173
```

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@electropos.com | admin123 |
| Cashier | cashier@electropos.com | cashier123 |

---

## POS / Checkout

The checkout page is built for touchscreen use:

- **Left panel** — Product browser with category filter tabs and search. Tap any card to add to cart instantly.
- **Right panel** — Live cart with `+` / `−` quantity controls, totals, and a permanently visible numpad.
- **Numpad** — Switch between *Cash Received* and *Discount* modes. Quick-amount buttons (500 / 1K / 2K / 5K) for fast cash entry. Live change/short display.
- **Payment methods** — Cash, Card, Bank Transfer, QR/UPI.
- **Customer** — Tap the customer row to open a modal: search existing customers by name/phone/email, or fill in a full new customer form (name, phone, email, address) without leaving the sale.
- **Bill printing** — After completing a sale, tap *Print Bill* to send an 80 mm receipt to the printer.

---

## Bill Printing

Receipts are printed via the browser's native print dialog.

**Setup for thermal printers:**
1. Set paper size to **80 mm × auto** (or "Receipt" if your printer driver supports it)
2. Set margins to **None**
3. Disable headers and footers

The receipt includes: shop name, invoice number, date/time, cashier name, customer name, itemised product list with quantities and prices, discount, total, payment method, change amount, and warranty details for eligible items.

---

## Environment Variables

Create `backend/.env` (or pass via Docker Compose environment):

```env
DATABASE_URL="file:/app/data/dev.db"   # SQLite path (or a postgres:// URL)
JWT_SECRET="change-this-in-production" # Long random string in production
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV=production
```

To use PostgreSQL instead of SQLite, change the `provider` in `backend/prisma/schema.prisma` to `postgresql` and update `DATABASE_URL`.

---

## Project Structure

```
Electro/
├── docker-compose.yml
├── data/                          # SQLite database volume (persisted)
├── backend/
│   ├── Dockerfile
│   ├── docker-entrypoint.sh       # First-run DB init + seed
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema
│   │   └── seed.js                # Demo data
│   └── src/
│       ├── middleware/
│       │   └── auth.js            # JWT verification
│       ├── routes/
│       │   ├── auth.js
│       │   ├── products.js
│       │   ├── categories.js
│       │   ├── suppliers.js
│       │   ├── customers.js
│       │   ├── sales.js           # Checkout, stock decrement, warranty creation
│       │   ├── warranties.js
│       │   ├── reports.js
│       │   └── users.js
│       └── index.js
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── components/
        │   ├── Layout.jsx
        │   ├── BarcodeScanner.jsx  # Webcam scanner
        │   ├── BarcodeGenerator.jsx
        │   └── ReceiptPrinter.jsx  # 80 mm thermal receipt
        ├── pages/
        │   ├── Login.jsx
        │   ├── Dashboard.jsx
        │   ├── POS.jsx             # Touch-optimised checkout
        │   ├── Products.jsx
        │   ├── Inventory.jsx
        │   ├── Customers.jsx
        │   ├── Warranties.jsx
        │   ├── Reports.jsx
        │   └── Settings.jsx
        ├── contexts/AuthContext.jsx
        └── services/api.js
```

---

## API Overview

All endpoints require a `Bearer <token>` header (except `/api/auth/login`).

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Current user info |
| GET | `/api/products` | List products (`?search=`, `?categoryId=`, `?lowStock=true`) |
| GET | `/api/products/barcode/:barcode` | Lookup by barcode |
| POST | `/api/products` | Create product (admin) |
| PUT | `/api/products/:id` | Update product (admin) |
| POST | `/api/products/:id/adjust-stock` | Manual stock adjustment (admin) |
| GET | `/api/categories` | List categories |
| GET | `/api/customers` | List / search customers |
| POST | `/api/customers` | Create customer |
| PUT | `/api/customers/:id` | Update customer |
| GET | `/api/sales` | List sales with filters |
| POST | `/api/sales` | Create sale (checkout) |
| POST | `/api/sales/:id/refund` | Refund a sale |
| GET | `/api/warranties` | List warranties |
| POST | `/api/warranties/check` | Check by serial number or invoice |
| PUT | `/api/warranties/:id/claim` | Process warranty claim |
| GET | `/api/reports/dashboard` | Dashboard stats |
| GET | `/api/reports/sales-chart` | Daily sales for last N days |
| GET | `/api/users` | User management (admin) |

---

## Warranty Workflow

1. When a sale is completed, a warranty record is automatically created for each item whose `warrantyMonths > 0`.
2. The warranty is linked to the sale item, product, and customer (if provided).
3. From the **Warranties** page, staff can search by serial number or invoice number, view expiry dates, and process claims.

---

## Database Schema (key models)

```
Product     — name, sku, barcode, price, costPrice, stock, minStock, warrantyMonths, isActive
Sale        — invoiceNo, subtotal, discount, taxAmount, total, paymentMethod, paymentStatus
SaleItem    — unitPrice, discount, quantity, total, warrantyMonths, serialNumber
Warranty    — startDate, endDate, status, serialNumber (linked to sale, product, customer)
Customer    — name, phone, email, address
StockMovement — type (in/out/adjust), quantity, reason
```

---

## License

MIT — free to use, modify, and distribute.
