# Persistent OneLink client registry (Cloudflare Worker + D1)

The registry implements **administrator-authenticated client registration**, not the OneLink OIDC authorization server. It does not issue tokens.

## Provisioning

1. Create a Cloudflare D1 database named `domislink-onelink-registry-db`.
2. Replace `REPLACE_WITH_REAL_D1_DATABASE_ID` in `wrangler.jsonc` with the returned D1 database UUID.
3. Apply migration: `npx wrangler d1 migrations apply domislink-onelink-registry-db --remote --config services/onelink-registry/wrangler.jsonc`.
4. Store a unique random 32+ character secret using `npx wrangler secret put REGISTRY_ADMIN_TOKEN --config services/onelink-registry/wrangler.jsonc`.
5. Deploy with `npx wrangler deploy --config services/onelink-registry/wrangler.jsonc`.
6. Do not expose the admin token in frontend bundles or public source code. Restrict admin routes further with Cloudflare Access/service authentication before production use.

## Endpoints

- `GET /health` — service liveness
- `GET /admin/clients` — list client registrations (bearer admin token)
- `POST /admin/clients` — register client (bearer admin token)
- `GET /admin/clients/:clientId` — read registration
- `PATCH /admin/clients/:clientId` — update allowed fields

The registry must be integrated into the **actual OneLink authorization endpoint** before registered clients affect production sign-in. In-memory `ApplicationRegistry` remains a separate contract/reference implementation. A shared administrative token is a bootstrap control only: production should adopt per-operator identity, role-based authorization, and immutable actor IDs in audit events.

## Verification

`node --test tests/onelink-integration.test.mjs tests/onelink-registry-worker.test.mjs`

**Not yet complete:** Live D1 provisioning, remote migration, deployment, actual gateway client lookup, verified JWKS/OIDC token validation in a participating app, and end-to-end login testing.
