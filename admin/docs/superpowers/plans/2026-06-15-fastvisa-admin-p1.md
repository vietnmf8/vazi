# FastVisa Admin — Phase 2 & 3 Implementation Plan

> **Prerequisite:** Phase 1 production-ready (overview, applications, support, chat).

## Phase 2 — CMS & Moderation

**Goal:** Full CRUD for content entities currently only partially exposed via public PUT routes.

### API (`/api/v1/admin/`)

| Resource | Endpoints | Notes |
|----------|-----------|-------|
| Articles | GET list, GET :id, POST, PUT :id, DELETE :id | Include translations tab (vi/en/ko) |
| FAQs | GET, POST, PUT :id, DELETE :id | Extend existing PUT |
| Guidelines | GET, POST, PUT :id, DELETE :id | |
| Step Guidelines | GET, POST, PUT :id, DELETE :id | How-it-works |
| Team Members | GET, POST, PUT :id, DELETE :id | |
| Reviews | GET, POST, PUT :id, DELETE :id | |
| Comments | GET list, DELETE :id | Soft-delete moderation |
| Page Settings | GET, PUT :key | Replace raw JSON editing |
| Global Settings | GET, PUT :key | Replace `x-admin-secret` |

### Admin UI

| Route | Component pattern |
|-------|-------------------|
| `/content/articles` | DataTable + editor drawer |
| `/content/faqs` | DataTable + form modal |
| `/content/guidelines` | Same |
| `/content/steps` | Same |
| `/content/team` | Image upload (reuse UI ImageUploadZone) |
| `/content/reviews` | Star rating display |
| `/content/comments` | Moderation list |
| `/settings/pages` | JSON editor with schema hints |
| `/settings/global` | Key-value editor |

Enable nav items in `nav-config.ts` behind `phase2: true` flag.

**Verify:** api build + dev + curl each CRUD; admin dev + build.

---

## Phase 3 — Master Data & Users

**Goal:** Manage reference data driving public visa flows.

### API

| Resource | Endpoints |
|----------|-----------|
| Nationalities | CRUD + translations |
| Ports | CRUD |
| Pricing Rules | CRUD + translations |
| Visa Exemption Countries | CRUD |
| Eligibility Rules | CRUD + translations |
| Newsletter | GET list, PATCH unsubscribe |
| Users | GET list (read-only), no create |

### Admin UI

| Route |
|-------|
| `/master/nationalities` |
| `/master/ports` |
| `/master/pricing` |
| `/master/exemptions` |
| `/master/eligibility` |
| `/marketing/newsletter` |
| `/users` |

Group under sidebar "Cài đặt hệ thống" per UX team consensus.

**Verify:** Same gate as P1/P2.

---

## Suggested order

1. P2 Global/Page Settings (unblocks content ops)
2. P2 Articles + FAQs (highest edit frequency)
3. P2 Team + Reviews + Comments
4. P3 Pricing + Nationalities + Ports
5. P3 Eligibility + Exemptions
6. P3 Newsletter + Users (read-only)

## Admin user setup (required for login)

```sql
-- Create admin user matching ALLOWED_ADMIN_EMAIL in api/.env
INSERT INTO users (id, email, password_hash, full_name, phone, role)
VALUES (UUID(), 'admin@fastvisa.com', '<bcrypt hash>', 'Admin', '0000000000', 'ADMIN');
```

Or add `prisma/seed.ts` entry with bcrypt hash for local dev.
