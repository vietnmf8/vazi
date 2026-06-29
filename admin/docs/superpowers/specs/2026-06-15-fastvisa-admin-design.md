# FastVisa Admin Dashboard — Design Spec

**Date:** 2026-06-15  
**Status:** Approved  
**Scope:** Phase 1 (Core Operations) — production-ready first

## Decisions

| Topic | Decision |
|-------|----------|
| Scope | 3 phases; ship P1 first |
| Auth | Single account via `ALLOWED_ADMIN_EMAIL` env + `ADMIN` role |
| Language | Vietnamese only, large labels, simple terms |
| Theme | Light mode, amber/teal accents from UI project |
| API | New `/api/v1/admin/*` MVCS layer |

## Architecture

- **Admin FE:** Next.js 16, axios + React Query, client-heavy (no SEO)
- **API:** Express MVCS, JWT Bearer 8h, envelope `{ success, data, error }`
- **Reuse from UI:** status CSS tokens, Badge/Select patterns, form RHF+zod

## Phase 1 Pages

| Route | Purpose |
|-------|---------|
| `/login` | Single admin login (VI) |
| `/` | Overview KPI + urgent tasks |
| `/applications` | Visa application list |
| `/applications/[id]` | Detail + status update |
| `/support` | Support tickets |
| `/sessions` | Live chat (existing) |
| `/history` | Chat history (existing) |

## Phase 1 API Endpoints

- `GET /api/v1/admin/dashboard/stats`
- `GET /api/v1/admin/applications`
- `GET /api/v1/admin/applications/:id`
- `PATCH /api/v1/admin/applications/:id/status`
- `GET /api/v1/admin/support-tickets`
- `PATCH /api/v1/admin/support-tickets/:id`

## Layout

Header (logo + logout) + Sidebar (grouped nav) + Main scroll area.

## Phase 2 (CMS) & Phase 3 (Master data)

Deferred — see `docs/superpowers/plans/2026-06-15-fastvisa-admin-p2-p3.md`.
