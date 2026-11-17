# Architectural Decisions Record (ADR)

## ADR-001: Database Abstraction & Migration Engine (Knex.js + PostgreSQL & In-Memory Fallback)
- **Context:** The prompt mandates PostgreSQL with a migration tool (Prisma or Knex, justified in one line).
- **Decision:** Knex.js.
- **Justification:** Knex provides direct, dialect-flexible SQL migration and query building with native PostgreSQL row-level locking (`FOR UPDATE`) for concurrency-safe batch ledger transactions, while allowing dynamic database switching for zero-external-dependency local CI/sandbox testing.
- **Status:** Accepted.

## ADR-002: Dual Design Systems in Single Monorepo
- **Context:** The project requires two fundamentally different design systems:
  1. Public Website: Premium, modern, professional horticulture brand with earthy/natural green palette, Playfair Display serif headings, generous whitespace, scroll-reveals.
  2. Private App: High-contrast, mobile-first (360-430px), low-literacy, tap-over-type UI with steppers, 48px touch targets, bilingual (EN/HI) support, and bottom navigation.
- **Decision:** Unified Tailwind configuration with explicit namespace separation (`brand-*` for public, `ops-*` for private app) and dynamic class-based theme switcher for Light/Dark/System.
- **Status:** Accepted.

## ADR-003: Double-Entry Immutable Ledger for Inventory Movements
- **Context:** Batch quantities must never go negative, and all inventory must be verifiable and auditable without relying on mutable snapshot overwrites.
- **Decision:** Every inventory adjustment, sowing, grafting input/output, mortality, ready promotion, and sale deduction writes an immutable record to `inventory_movements` with transaction safety and updates `current_quantity`. Current balance can always be recomputed and verified from the ledger.
- **Status:** Accepted.

## ADR-004: Strict Separation of Public Catalogue and Inventory Batches
- **Context:** Public catalogue products are NEVER merged with inventory batches.
- **Decision:** Catalogue products are stored in `products`. Real nursery stock is held in `batches`. The relation is established strictly via a junction table `product_batch_links`. Public availability (In Stock, Limited, Out of Stock) is derived in real-time as a read-only projection from active, non-quarantined `READY_FOR_SALE` batches linked to the product.
- **Status:** Accepted.

## ADR-005: Pluggable IdentifierService (SERIAL Active, QR/BARCODE Disabled/Ready)
- **Context:** System requires serial numbers now with pluggable support for QR and Barcode later without refactoring business logic.
- **Decision:** Implemented `IdentifierService` with Strategy pattern (`SerialStrategy`, `QrStrategy`, `BarcodeStrategy`), persistent `identifiers` table, configurable serial templates (`{PREFIX}-{YYYY}-{SEQ:5}`), and database-enforced atomic sequence allocation.
- **Status:** Accepted.

