# OneLink Central Services Control Centre — Milestone 1

## Purpose and placement
- `domislink.com` (separate `domislink-app` repository): public product discovery and service catalog.
- `onelink.domislink.com/services` (this repository, future route): authenticated central services directory, integration approvals, admin operations.
- `sso.domislink.com` (separate `domislink-sso` repository): **only** OIDC identity provider.
- Central Services Registry API (separate Cloudflare Worker + D1, future): service metadata, health observations, integration approvals and audit records.
- Paystack, WhatsApp and other central services: independently owned adapters and APIs; never duplicate these services inside OneLink.

## What this commit implements
A standalone Vite multi-page source at `frontend/services.html` with a searchable, read-only service catalog, no credential handling, and disabled administrator controls. Its data is bootstrap metadata, **not** verified production status. Vite's default single-page build does not automatically emit this second HTML entry: a later build configuration must explicitly include it before deployment. Do not claim this page is live.

## Authorization and security contract for next milestone
1. Reuse the deployed SSO issuer and OIDC authorization-code + PKCE flow. Do not build a second login form, token issuer, JWKS, or password table.
2. The backend must verify issuer, audience, signature, expiration and scopes, and enforce per-operator role and tenant boundaries; client-side gating is never sufficient.
3. Store service definitions, ownership, approved scopes and status observations in D1. Keep secrets in Cloudflare Worker secrets; never expose admin tokens to browser bundles.
4. Allowlist monitored service origins to prevent SSRF; apply rate limits, audit all mutations, and verify webhook signatures and idempotency.
5. Migrate from bootstrap metadata to an authenticated API only after existing OneLink/Church login and callbacks are confirmed. Preserve existing production routes and sessions.

## Verify
`node --test tests/central-services-control.test.mjs` from repository root. Add Vite multi-page configuration and run build checks before deploying.
