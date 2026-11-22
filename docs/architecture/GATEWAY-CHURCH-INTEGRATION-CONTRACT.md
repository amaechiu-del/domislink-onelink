# OneLink gateway and Church integration: verified implementation boundaries

## Existing live-system source

The existing OneLink gateway is currently maintained in `amaechiu-del/domislink-church/services/sso/recovered/index.js`, deployed as Worker `domislink-sso-gateway` on `sso.domislink.com`. Its configuration binds D1 database `domislink-church-db`, and its authorization implementation reads clients from **`sso_clients`**, not `oidc_clients`.

The gateway's actual discovery endpoint is `https://sso.domislink.com/.well-known/openid-configuration`, with authorization endpoint `https://sso.domislink.com/oauth/authorize`, token endpoint `/oauth/token`, and JWKS endpoint `/oauth/jwks`. The shared authorization-request module has been aligned to the actual authorization route.

The Church application already contains `src/onelink-oidc.ts` with RS256/JWKS token verification logic. **Do not replace it blindly** with a homegrown JWT parser.

## Integration constraint — no dual sources of truth

The newly committed standalone registry Worker uses `oidc_clients` and a separate proposed D1 database. It is **not** connected to the existing production gateway. Running both registries independently would cause inconsistent permissions and callback configuration.

**Production gate:** Before deploying the standalone registry, decide and implement a single authoritative client store. Preferred incremental approach: retain the existing gateway `sso_clients` table and extend the gateway with authenticated client-management APIs, schema migrations, and audit logging. Alternatively, deliberately migrate both gateway lookup and registry administration to a dedicated shared D1 database in one tested release. Do not silently provision two active registries.

## Church pilot acceptance

1. Confirm actual OneLink discovery, JWKS, issuer, and registered Church client ID and callback from existing production configuration.
2. Ensure login creates a short-lived server-side transaction with state, nonce, PKCE verifier and exact redirect URI.
3. Exchange authorization code once at `/oauth/token`; validate RS256 signature, issuer, audience, expiry, nonce and token type using Church's reviewed verifier.
4. Link the stable `sub` to a Church-local account only after authenticated ownership checks; do not merge on email alone.
5. Resolve Church workspace membership from Church D1; reject unauthorized tenant access.
6. Test invalid signature, stale/replayed state, wrong nonce, wrong audience, code replay, missing membership, cross-tenant reads, sign-out and account recovery.
7. Run staging and production smoke tests before changing DNS or retiring legacy login.

## Legacy landing page separation

The former `domislink-app` repo contains `frontend/`, `render.yaml` and a public app-card landing page. These remain legacy assets after repository rename. Do not deploy that frontend as the OneLink login service. Move the public app directory to its own repo only after confirming its existing deployment/URLs; preserve the current gateway's deployed login UI and routes during migration.

## Current status

- Repository rename to `amaechiu-del/domislink-onelink`: confirmed through GitHub.
- Shared OIDC request path aligned with gateway: committed.
- Standalone registry Worker and D1 migration: committed but not deployed or authoritative.
- Existing Church verifier and gateway source: located and inspected.
- Live gateway integration, production client migration and end-to-end Church sign-in: **not yet completed**.
