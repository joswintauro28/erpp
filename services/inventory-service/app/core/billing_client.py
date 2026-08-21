from app.core.config import settings

# Resolved from settings so Docker Compose can point this at the billing
# container (http://billing-service:8003) instead of a hardcoded localhost.
BILLING_SERVICE_URL = f"{settings.BILLING_SERVICE_URL}/api"

# NOTE: Accounts-Payable entries are created exclusively via the RabbitMQ
# `inventory.po.created` event (single AP path). The former REST webhook
# (`/api/internal/billing/trigger-vendor-bill`) is intentionally not called
# from inventory anymore — a `trigger_vendor_bill` helper was removed to
# prevent duplicate AP invoices for the same purchase order. The guarded,
# idempotent internal endpoint still exists for manual/backfill use.
