# Testing Architecture & Verification Guide

This repository maintains comprehensive automated tests covering unit algorithms, integration routes, database ledger transactions, and end-to-end user workflows.

---

## 1. Test Suites Overview

### A. Unit Tests (`server/src/services/identifier/IdentifierService.test.ts`)
- **Framework:** Vitest
- **Scope:**
  - `SerialStrategy` format rendering, template replacement (`{PREFIX}-{YYYY}-{SEQ:5}`), zero-padding, and regex validation.
  - Pluggable `QrStrategy` and `BarcodeStrategy` (Code128) format checks and validation.
  - Concurrency-safe monotonic sequence allocation in `sequences` table.
  - Persistent insertion into `identifiers` table and bidirectional lookup.
  - Printable label metadata generation.

### B. Full API Integration Suite (`server/src/tests/api.test.ts`)
- **Framework:** Vitest + Supertest
- **Scope (28 Automated Tests across All Milestones):**
  1. **M2 & M4 (Public & CMS):**
     - Public branding and WhatsApp `wa.me` configuration delivery.
     - Section ordering and automatic expired banner suppression.
     - Product catalogue search, category filtering, and derived availability computation.
     - Public enquiry submission and honeypot spam neutralization.
  2. **M3 (Auth & RBAC):**
     - Unauthenticated access rejection (401).
     - Field Worker and Supervisor role boundary enforcement against Admin CMS (403).
     - Brute-force failed login counter and 15-minute account lockout upon 5 attempts.
     - Admin access authorization.
  3. **M5 (Nursery Inventory & Ledger Integrity):**
     - Sowing wizard execution: ROOTSTOCK batch creation and positive ledger movement.
     - Scion harvest wizard: SCION batch creation.
     - Grafting wizard: Rootstock and scion parent deduction, new GRAFTED batch creation, parent-child `batch_lineage` registration.
     - Negative stock prevention check: over-grafting throws error and aborts transaction.
     - Mortality logging: loss deduction and negative ledger entry.
     - Ready promotion: GRAFTED batch reduction, new READY_FOR_SALE batch creation with lineage link.
  4. **M6 (Sales, Traceability & Quarantine Cascades):**
     - Customer order execution: atomic batch deduction, invoice generation, over-selling block.
     - Traceability endpoint: full pedigree graph resolution from serial code (`GR-2026-00001`).
     - Quarantine action: cascading block of all descendant batches, immediate removal from sale, and release with recorded justification.

---

## 2. Running Automated Tests

### Unit & Integration Tests (Server)
```bash
npm --prefix server test
```

### Type Checking & Build Verification
```bash
# Server TypeScript check
npx --prefix server tsc -p server/tsconfig.json --noEmit

# Client TypeScript check and production bundle build
npm --prefix client run build
```

### End-to-End Tests (Playwright)
```bash
# Run headless Playwright tests
npx playwright test

# Run Playwright tests with UI
npx playwright test --ui
```

