# Security Policy & OWASP Top 10 Assessment

## Security Architecture & Controls

The Deep Root Farms platform implements defense-in-depth principles across both public catalogue browsing and private mobile operations.

### 1. Authentication & Session Security
- **Hashing:** Passwords hashed with Bcrypt (salt rounds: 10).
- **Token Strategy:** Dual-token model with short-lived JWT access tokens (15 minutes) and rotating refresh tokens (7 days).
- **Cookie Security:** Refresh tokens are delivered via `httpOnly`, `SameSite: Lax` (or `Strict`), and `Secure` (HTTPS in production) cookies, mitigating XSS token harvesting.
- **Brute-Force & Lockout:** Login rate limiting (20 attempts per 15 minutes) with automatic 15-minute account lockout upon 5 consecutive failed attempts.
- **Forced Password Rotation:** New staff accounts can be flagged with `force_password_change: true`, preventing access to operations until a new password of minimum 8 characters is established.

### 2. Authorization & RBAC (Role-Based Access Control)
- **Role Hierarchy:**
  - `ADMIN`: Unrestricted operational and CMS configuration access.
  - `SUPERVISOR`: Inventory management, sales execution, batch quarantine authority.
  - `USER` (Technician/Field Worker): Read-only inventory and write access restricted to field logs (sowing, grafting take, mortality counts).
- **IDOR Protection:** All queries are parameterized and scoped strictly by active database tenant and permissions matrix. Private operational endpoints require authenticated middleware.

### 3. Anti-Spam & Public Form Defenses
- **Honeypot Trap:** All public consultation forms feature an invisible `botField` input element ignored by humans but filled by automated spam scrapers. Any submission with this field populated is silently neutralized.
- **Form Rate Limiting:** 10 submissions per IP per hour on `/api/public/enquiry`.

### 4. Injection & Database Integrity
- **Parameterized SQL:** All queries executed via Knex.js query builder with prepared statements. Raw concatenation is prohibited.
- **Zod Validation:** Strict request schema validation on every API endpoint. Malformed types or unexpected fields are rejected prior to execution.
- **Output Sanitization:** Sensitive fields (`password_hash`, failed attempt counts, reset tokens) are stripped from user responses.

### 5. Content Security Policy (CSP) & Headers
- Integrated `helmet` middleware configuring:
  - `Content-Security-Policy`: Restricts scripts to trusted origins, allows Google Fonts stylesheets and images from authenticated CDNs / local storage.
  - `X-Frame-Options: SAMEORIGIN` / `DENY`
  - `X-Content-Type-Options: nosniff`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`

---

## OWASP Top 10 Checklist & Audit Results

| Vulnerability Category | Status | Mitigations Implemented in Codebase |
| :--- | :---: | :--- |
| **A01: Broken Access Control** | **PASS** | Role-based middleware (`requireAuth`, `requireRole`, `requirePermission`) on all private routes. Users cannot access Admin CMS settings. |
| **A02: Cryptographic Failures** | **PASS** | Bcrypt password hashing, SHA-256 password reset tokens, secure environment variable handling with no hardcoded credentials. |
| **A03: Injection** | **PASS** | 100% parameterized queries via Knex; strict Zod input parsing on all request bodies and query parameters. |
| **A04: Insecure Design** | **PASS** | Strict separation of public catalogue and private inventory; immutable double-entry ledger preventing negative stock; automatic quarantine cascade. |
| **A05: Security Misconfiguration** | **PASS** | Strict Helmet headers, CORS allowlist restricted to authorized origins, disabled stack-trace leakage in production error handlers. |
| **A06: Vulnerable and Outdated Components** | **PASS** | Pure JavaScript dependencies without legacy native C++ compiler requirements; audit verification passing. |
| **A07: Identification & Authentication Failures** | **PASS** | Brute-force lockout after 5 failed attempts; rotating refresh tokens; secure httpOnly cookie delivery. |
| **A08: Software and Data Integrity Failures** | **PASS** | Signed JSON Web Tokens; verified migration scripts with foreign-key constraints preventing orphan records. |
| **A09: Security Logging & Monitoring Failures** | **PASS** | Dedicated `audit_logs` table tracking logins, password updates, CMS changes, inventory operations, and quarantine events with IP and User-Agent capture. |
| **A10: Server-Side Request Forgery (SSRF)** | **PASS** | No arbitrary URL fetch endpoints; static WhatsApp redirects use structured `wa.me` links generated strictly from database settings. |

