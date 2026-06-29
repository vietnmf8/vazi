# Application Code Post-Payment & Admin Full Edit — Design Spec

**Date:** 2026-06-15  
**Status:** Approved for implementation

## Business decisions

| Topic | Decision |
|-------|----------|
| Admin list | Show **PAID+** only; lifecycle `PAID → PROCESSING → COMPLETED / REJECTED` |
| Customer code `VN-…` | Generated **only on PayPal capture success** |
| Pre-payment | Internal `id` (cuid); no customer-facing code |
| User self-edit after paid | No — Contact Us / Live Chat only |
| Unpaid orders | Internal only; abandoned cart magic link uses internal id |
| Admin edit | Full field edit + audit log |
| Price on admin edit | Auto-recalculate `total_amount` (no PayPal refund/charge) |
| Legacy data | Keep existing PENDING with VN- id; on pay → `applicationCode = id` |

## Schema

- `VisaApplication.applicationCode` — nullable, unique, customer booking number
- `VisaApplication.id` — `@default(cuid())` for new records; legacy VN- ids unchanged
- `VisaApplicationAuditLog` — admin changes with JSON diff

## API changes

- Submit: create with cuid id, `applicationCode = null`
- Payment capture: set PAID + assign `applicationCode`
- Check status: lookup by `applicationCode` + email
- Admin list: default exclude PENDING; search by `applicationCode`
- Admin PATCH: full update + audit; status transitions validated

## UI changes

- Admin: list shows `application_code`; edit form + audit timeline on detail
- User UI: success page shows `application_code` from capture response
