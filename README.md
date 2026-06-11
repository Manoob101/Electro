# ElectroPOS

An open-source cloud-based Point of Sale system built for electronics shops. Manage products, sales, warranties, inventory, and customers from any browser.

![License](https://img.shields.io/badge/license-MIT-blue) ![Node](https://img.shields.io/badge/node-%3E%3D18-green) ![React](https://img.shields.io/badge/react-18-blue)

---

## Features

- **POS / Checkout** — Search products, scan barcodes via webcam, manage cart, accept Cash / Card / UPI / Bank Transfer, print receipts
- **Barcode Support** — Webcam barcode scanner, EAN-13 barcode generation, printable barcode labels
- **Warranty Management** — Auto-tracks warranty per item sold, search by serial number or invoice, process claims
- **Bill Printing** — Thermal printer-friendly 80 mm receipt with warranty details, invoice number, and GST number
- **Product Management** — Full CRUD, categories, suppliers, low-stock alerts
- **Inventory** — Stock adjustments (add / remove / set), full movement audit trail
- **Customer CRM** — Purchase history and active warranties per customer
- **Reports** — Daily/monthly sales charts, payment method breakdown, CSV export
- **User Management** — Admin and Cashier roles, per-user access control

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

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher

### 1. Clone the repository

```bash
git clone https://github.com/manoob101/electro.git
cd electro
```

### 2. Set up the backend

```bash
cd backend
npm install
npm run setup        # generates Prisma client, runs migrations, seeds demo data
npm run dev          # starts API server on http://localhost:5000
```

### 3. Set up the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev          # starts dev server on http://localhost:3000
```

Open **http://localhost:3000** in your browser.

### Demo credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@electropos.com | admin123 |
| Cashier | cashier@electropos.com | cashier123 |

---

## Docker (recommended for production)

```bash
docker-compose up --build
```

- Frontend → http://localhost:3000
- Backend API → http://localhost:5000

The container runs migrations and seeds the database automatically on first start.

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and edit as needed:

```env
DATABASE_URL="file:./dev.db"        # SQLite path (or a postgres:// URL)
JWT_SECRET="change-this-secret"     # Use a long random string in production
JWT_EXPIRES_IN="7d"
PORT=5000
```

To use PostgreSQL instead of SQLite, change the `provider` in `backend/prisma/schema.prisma` to `postgresql` and update `DATABASE_URL`.

---

## Project Structure

```
electro/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── seed.js             # Demo data
│   └── src/
│       ├── middleware/
│       │   └── auth.js         # JWT verification
│       ├── routes/
│       │   ├── auth.js
│       │   ├── products.js
│       │   ├── categories.js
│       │   ├── suppliers.js
│       │   ├── customers.js
│       │   ├── sales.js        # Checkout + warranty creation
│       │   ├── warranties.js
│       │   ├── reports.js
│       │   └── users.js
│       └── index.js
└── frontend/
    └── src/
        ├── components/
        │   ├── Layout.jsx
        │   ├── BarcodeScanner.jsx   # Webcam scanner
        │   ├── BarcodeGenerator.jsx # Label printer
        │   └── ReceiptPrinter.jsx   # 80mm receipt
        ├── pages/
        │   ├── Login.jsx
        │   ├── Dashboard.jsx
        │   ├── POS.jsx             # Main checkout page
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

All endpoints are prefixed with `/api` and require a `Bearer` token (except `/auth/login`).

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login` | Login and receive JWT |
| GET | `/auth/me` | Current user |
| GET | `/products` | List products (`?search=`, `?categoryId=`, `?lowStock=true`) |
| GET | `/products/barcode/:barcode` | Barcode lookup |
| POST | `/products` | Create product (admin) |
| PUT | `/products/:id` | Update product (admin) |
| POST | `/products/:id/adjust-stock` | Adjust stock (admin) |
| GET | `/sales` | List sales with filters |
| POST | `/sales` | Create sale / checkout |
| POST | `/sales/:id/refund` | Refund a sale |
| GET | `/warranties` | List warranties |
| POST | `/warranties/check` | Check by serial or invoice |
| PUT | `/warranties/:id/claim` | Process a warranty claim |
| GET | `/reports/dashboard` | Dashboard stats |
| GET | `/reports/sales-chart` | Daily sales for last N days |
| GET | `/categories` | List / create / update categories |
| GET | `/customers` | List / create / update customers |
| GET | `/users` | User management (admin) |

---

## Receipt & Barcode Printing

**Receipts** are printed via the browser's native print dialog. The receipt component is styled for 80 mm thermal printers. In your browser print settings, set paper size to 80 mm × auto and disable headers/footers.

**Barcode labels** open in a new window and auto-print. Each label shows the barcode (CODE128), product name, and price.

---

## Warranty Workflow

1. When a sale is completed, a warranty record is automatically created for each item whose `warrantyMonths > 0`.
2. The warranty is linked to the sale item, product, and customer (if provided).
3. From the **Warranties** page, staff can search by serial number or invoice number, view expiry dates, and process claims.
4. The **Check Warranty** button lets you instantly look up warranty status — useful for walk-in customers.

---

## License

MIT — free to use, modify, and distribute.
