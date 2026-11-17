# Deep Root Farms Management Platform 🌱
> **Integrated Horticulture Platform**: Public Catalogue, Mobile-First Operations App, and Ledger-Based Inventory Management

---

## 📌 Executive Summary & Architectural Overview

The **Deep Root Farms Management Platform** is an enterprise-grade, monorepo application engineered specifically for certified plant propagation, graft traceability, and multi-channel nursery operations.

The system enforces six foundational architectural rules:
1. **Strictly Catalogue Only (No E-Commerce)**: No shopping cart, checkout, or payment gateway. Public users browse cultivars, review technical specifications, and generate direct inquiries via WhatsApp or direct inquiry forms.
2. **Derived Public Availability**: Public catalogue products are never merged with inventory batches. Product stock status (*In Stock*, *Limited Stock*, *Out of Stock*, *Coming Soon*) is dynamically and read-only derived from non-quarantined `READY_FOR_SALE` batches linked to the product.
3. **Admin CMS-Driven Content**: No farm name, hero texts, banners, or technical specs are hardcoded. All user-facing content is managed via the Admin CMS and protected by a cache-invalidation layer.
4. **Permanent Lineage Protection**: Parent-child batch relationships (Seed Lot → Rootstock Batch + Mother Tree → Scion Batch → Grafted Batch → Curing Batch → Ready for Sale Batch) are strictly preserved using database foreign key constraints, atomic transactions, and soft-delete/archive mechanics. Lineage can never be destroyed.
5. **Double-Entry Ledger Accounting**: Inventory balances are never directly updated. Every seed sown, scion cut, graft assembled, mortality discarded, or plant sold writes an immutable record to the `inventory_movements` ledger. Batch balance is computed as \(\sum \text{quantity}\), mathematically preventing negative stock.
6. **Dual Distinct Design Systems with WCAG AA Light & Dark Themes**:
   - **Public Website (`/client/src/public`)**: Premium, editorial horticulture branding. Deep forest greens (`#1e3d29`), warm cream surfaces, Playfair Display typography, generous whitespace, and subtle micro-interactions.
   - **Private App (`/client/src/app`)**: Ultra-simple, mobile-first operational interface designed for 360–430px smartphone viewports. Tailored for field workers with low technical and language literacy: 48px–56px touch targets, steppers instead of typing, big status cards (icon + word + color), step-by-step wizards with progress bars, and full English / Hindi bilingual localization.

---

## 🏗️ Monorepo Structure

```
nurcery/
├── client/                     # Frontend Application (React 18, Vite, Tailwind CSS)
│   ├── public/                 # Static assets, PWA manifest.json, robots.txt, sitemap.xml
│   ├── src/
│   │   ├── app/                # Private Operations App (Mobile-first, 360-430px)
│   │   │   ├── components/     # App shell, BottomNav, MobileHeader, Stepper, StatusBadge
│   │   │   └── pages/          # Dashboard, Stock, Sales, Traceability, CMS, Wizards
│   │   ├── context/            # AuthContext, ThemeContext, i18n
│   │   ├── i18n/               # Bilingual locales (en.json, hi.json)
│   │   ├── public/             # Public Website (Editorial, Natural Green, Playfair Display)
│   │   │   ├── components/     # Navbar, Footer, SeoHead, EnquiryModal
│   │   │   └── pages/          # Home, About, Products, ProductDetail, Gallery, Contact, Login
│   │   ├── services/           # Axios API client with automatic token refresh
│   │   └── types/              # TypeScript models for products, batches, lineage, orders
│   └── vercel.json             # Vercel deployment configuration with SPA routing
│
├── server/                     # Backend API & Ledger Engine (Node.js, Express, Knex)
│   ├── src/
│   │   ├── db/                 # Knex configuration, 27 migrations, seed scripts
│   │   ├── middleware/         # Auth JWT, RBAC guards, rate limiters, Helmet CSP, error handler
│   │   ├── routes/             # REST endpoints (auth, cms, inventory, sales, trace)
│   │   ├── services/           # IdentifierService (Serial, QR, Barcode), AuditService, Cache
│   │   └── types/              # Express and Knex typed extensions
│   ├── Dockerfile              # Production multi-stage Docker build
│   └── tests/                  # Vitest backend integration test suite (28/28 tests passing)
│
├── docker-compose.yml          # Local PostgreSQL 16 container definition
├── DECISIONS.md                # Architectural Decision Records (ADR-001 through ADR-005)
├── SECURITY.md                 # OWASP Top 10 hardening, CSP policies, rate limits
├── DEPLOYMENT.md               # Production deployment runbook (Vercel + Docker / VPS / GCP)
├── TESTING.md                  # Comprehensive test verification results
├── OPENAPI.yaml                # OpenAPI 3.0 REST specification
└── scripts/
    └── captureScreenshots.ts   # Automated Playwright visual regression suite
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.0.0 or later (v24.14.1 LTS tested)
- **npm**: v9.0.0 or later
- **Docker** *(Optional for local development; built-in pure JavaScript PostgreSQL engine runs out-of-the-box)*

### 1. Installation
Clone the repository and install all monorepo dependencies:
```bash
git clone https://github.com/your-org/nurcery.git
cd nurcery
npm install
npm --prefix server install
npm --prefix client install
```

### 2. Zero-Dependency Local Development (Default)
The server includes a zero-dependency, pure-JS PostgreSQL in-memory engine (`pg-mem`). You can run the entire stack immediately without installing or configuring external databases:
```bash
# Terminal 1: Run Backend API & Database (Port 5000)
npm run dev:server

# Terminal 2: Run Client Frontend (Port 5173)
npm run dev:client
```
Visit `http://localhost:5173` in your browser.

### 3. Production Database Setup (Docker PostgreSQL)
To connect to a persistent PostgreSQL instance:
```bash
# 1. Start PostgreSQL 16 via Docker Compose
docker compose up -d

# 2. Configure server/.env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nursery_db

# 3. Execute migrations and seed data
npm run migrate
npm run seed        # Seeds with [SAMPLE DATA] markers
# OR
npm run seed:real   # Seeds clean baseline settings without demo sample records
```

---

## 👥 Default Demo Accounts & Roles

The system seeds three verified accounts covering all RBAC permission tiers:

| Role | Email | Password | Permissions & Scope |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@nursery.local` | `Admin@12345` | Full system access: CMS management, website settings, identifier strategy switch, user permissions, audit logs, inventory & sales. |
| **SUPERVISOR** | `supervisor@nursery.local` | `Supervisor@12345` | Operational management: Sowing, grafting, mortality logging, promotions, sales order creation, quarantine initiation/release. |
| **USER / WORKER** | `worker@nursery.local` | `Worker@12345` | Field technician: Simplified mobile wizard access for mortality recording and batch scanning. |

---

## 🏷️ Pluggable Identifier Architecture

The platform features a modular `IdentifierService` built on the **Strategy Pattern**. It decouples physical tagging mechanisms from core nursery business logic:

```mermaid
classDiagram
    class IdentifierService {
        +generate(entityType, context) string
        +format(scheme, raw) string
        +validate(code) boolean
        +lookup(code) EntityRecord
        +renderLabel(code) LabelPayload
    }
    class IdentifierStrategy {
        <<interface>>
        +generate(entityType, context) string
        +format(raw) string
        +validate(code) boolean
        +render(code) LabelPayload
    }
    class SerialStrategy {
        +generate(entityType, context) string
    }
    class QrStrategy {
        +generate(entityType, context) string
    }
    class BarcodeStrategy {
        +generate(entityType, context) string
    }

    IdentifierService --> IdentifierStrategy
    IdentifierStrategy <|.. SerialStrategy : Active
    IdentifierStrategy <|.. QrStrategy : Prepared
    IdentifierStrategy <|.. BarcodeStrategy : Prepared
```

### Identifier Features:
1. **Active Mode (`SERIAL`)**: Formats serials concurrency-safely via row-locked atomic database sequence tables (e.g., `RS-2026-00001`, `GR-2026-00001`, `SALE-2026-00001`). Sequences are never reused.
2. **Prepared Modes (`QR` and `BARCODE`)**: Fully implemented in code. The QR strategy generates clean SVG/PNG data URIs via the `qrcode` library. The UI automatically displays the Camera Scanner button when `identifier_strategy` is switched from `SERIAL` to `QR` in the Admin Settings.
3. **Persistent Identifier Registry**: Every issued code is logged in the `identifiers` table (`entity_type`, `entity_id`, `scheme`, `value`, `status`, `issued_at`). An entity can hold multiple historical identifiers; old serial numbers continue to resolve after a strategy switch.

### Switching Strategies:
Admins can switch the active strategy at runtime in **CMS > Settings > Identifier Strategy** or via SQL:
```sql
UPDATE settings SET value = 'QR' WHERE key = 'identifier_strategy';
```

---

## 📊 Database Schema & Entity Relationships

```mermaid
erDiagram
    CATEGORIES ||--o{ PRODUCTS : categorizes
    PRODUCTS ||--o{ PRODUCT_BATCH_LINKS : links
    BATCHES ||--o{ PRODUCT_BATCH_LINKS : supplies
    SUPPLIERS ||--o{ SEED_LOTS : provides
    SEED_LOTS ||--o{ SOWING_RECORDS : originates
    SOWING_RECORDS ||--|| BATCHES : creates_rootstock
    MOTHER_TREES ||--o{ SCION_BATCHES : provides_cuttings
    BATCHES ||--o{ BATCH_LINEAGE : parent
    BATCHES ||--o{ BATCH_LINEAGE : child
    BATCHES ||--o{ INVENTORY_MOVEMENTS : balances
    BATCHES ||--o{ GRAFTING_RECORDS : produces
    ORDERS ||--o{ ORDER_ITEMS : contains
    BATCHES ||--o{ ORDER_ITEMS : fulfills
    USERS ||--o{ AUDIT_LOGS : triggers

    BATCHES {
        string id PK
        string serial_number UK
        string type
        string status
        int initial_quantity
        int current_quantity
        boolean is_quarantined
    }
    INVENTORY_MOVEMENTS {
        string id PK
        string batch_id FK
        string movement_type
        int quantity
        string reference_type
        string reference_id
    }
    BATCH_LINEAGE {
        string id PK
        string parent_batch_id FK
        string child_batch_id FK
        string relationship_type
    }
```

---

## 🛡️ Double-Entry Ledger & Inventory Mechanics

All stock levels are strictly computed from the `inventory_movements` table:
$$\text{Current Batch Balance} = \sum_{i} \text{movement\_type\_multiplier}_i \times \text{quantity}_i$$

Movement Types:
- `INITIAL_SOWING` (+): Sown seeds germinated and entered into a rootstock batch.
- `SCION_HARVEST` (+): Healthy cuttings harvested from a certified Mother Tree.
- `GRAFTING_INPUT` (-): Rootstock or scion deducted during grafting assembly.
- `GRAFTING_PRODUCED` (+): New grafted saplings placed into the curing phase.
- `MORTALITY_LOSS` (-): Discarded failed grafts, fungal casualties, or dried rootstocks.
- `PROMOTION` (+ / -): Successful cured grafts promoted into a `READY_FOR_SALE` batch.
- `SALE_DISPATCH` (-): Saleable saplings deducted upon customer invoice generation.
- `QUARANTINE_HOLD` / `QUARANTINE_RELEASE`: Administrative holds.

**Zero Negative Stock Guarantee**: Every mutation runs inside a Knex transaction (`db.transaction()`) with row-level locks (`forUpdate()`). If balance < requested deduction, the transaction rolls back with a `400 Bad Request`.

---

## 🔍 Pedigree Traceability & Recursive Quarantine

The platform provides complete lineage resolution starting from any serial number:

1. **Pedigree Resolution (`/api/trace/:code`)**:
   - Resolves rootstock batch, mother tree variety, scion harvest date, technician name, grafting date, germination survival rate, and curing period.
2. **Recursive Quarantine Cascade (`/api/trace/quarantine`)**:
   - When a batch is flagged (e.g., fungal outbreak or root rot), the system executes a recursive CTE query traversing all descendants.
   - All descendant batches are immediately flagged with `is_quarantined = true`.
   - Linked catalogue products immediately deduct the quarantined quantity from public availability.
   - An immutable record is created in `audit_logs`.
3. **Quarantine Release**:
   - Authorized supervisors can release quarantined batches by submitting a mandatory inspection reason.

---

## 🧪 Testing & Quality Assurance

The test suite covers unit tests, API integration tests, and Playwright visual regression:

```bash
# Run backend test suite (Vitest + supertest)
npm --prefix server test

# Run frontend unit tests
npm --prefix client test

# Run Playwright visual regression
npx playwright test
```

### Test Coverage Highlights:
- ✅ **10/10** `IdentifierService` unit tests (sequence formatting, parsing, uniqueness, strategy delegation).
- ✅ **18/18** Integration API tests (Auth lockout, RBAC rejection, double-entry ledger deduction, negative stock prevention, recursive quarantine cascade).
- ✅ **Total: 28/28 Passing Tests (100% success rate)**.

---

## 🔒 Security & OWASP Hardening

Detailed in [SECURITY.md](SECURITY.md):
- **Authentication**: Bcrypt password hashing (10 rounds), 15-minute JWT access tokens, rotating refresh tokens stored in `httpOnly`, `SameSite=Strict`, `Secure` cookies.
- **Brute Force Protection**: 5 consecutive failed login attempts trigger an automatic 15-minute account lockout.
- **Strict Content Security Policy (CSP)**: Enforced via Helmet with restricted script, style, and connect directives.
- **Rate Limiting**: Tiered limiters on auth endpoints (20 req/15m), public enquiry forms (5 req/15m), and general APIs (100 req/15m).
- **Spam Protection**: Invisible honeypot field (`website_fax`) on all public forms.
- **Input Validation**: Strict Zod schemas on every API payload.

---

## 📄 License & Attribution
Proprietary software developed for Deep Root Farms. All rights reserved.

