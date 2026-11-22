# OneLink integration improvement backlog

**Status:** Proposed implementation controls (not yet deployed)  
**Reviewed against:** [ADR-0001](./ADR-0001-onelink-central-identity-and-app-isolation.md)

## P0 — Release-blocking controls

1. **Application registry:** Store each app's immutable client ID, owner, allowed exact redirect/logout URIs, grant types, permitted scopes, allowed origins, and environment. Disallow wildcard redirect URIs. Audit changes.
2. **Reusable OIDC integration:** Publish a versioned shared package or gateway contract for authorization-code + PKCE, state/nonce validation, issuer/audience verification, JWKS signature validation, and safe session creation. Use server-side authorization checks for all privileged actions.
3. **Token lifecycle:** Define short-lived access tokens, refresh-token rotation and reuse detection where applicable, signing-key rollover with JWKS overlap, revocation, logout, and emergency account suspension. Avoid browser localStorage for long-lived credentials.
4. **Tenant isolation:** Bind `sub` to application-local user IDs and explicit tenant memberships. Enforce tenant IDs from trusted server-side membership, not client-provided claims alone. Add negative tests for cross-tenant reads/writes, invitations, and billing.
5. **Security acceptance suite:** Test invalid/expired token, wrong issuer/audience, forged signature, redirect tampering, CSRF, replay, session fixation, unauthorized workspace provisioning, and legacy-account linking collisions.

## P1 — Operational improvements

6. **Account-linking migration:** Require proof of control of both the legacy account and OneLink identity; support review, rollback, audit trail, and no automatic merge on email match.
7. **My Apps dashboard:** Display only apps/workspaces with verified membership; offer explicit onboarding for apps that allow self-service enrollment. OneLink authentication alone grants no access.
8. **Observability:** Correlation IDs, structured security audit events, privacy-safe metrics, alerting, token-issuance error rates, and incident runbooks. Avoid logging secrets or raw tokens.
9. **Availability and recovery:** Set SLOs, backups, tested recovery procedures, key custody rules, and behavior for OneLink downtime. Validate already-established app sessions locally until their normal expiration; do not bypass authorization checks.

## P2 — Scale

10. **Developer onboarding:** Document OIDC discovery, sample clients, SDK versions, callback configuration, security checklist, sandbox environment, and contract tests for each new app.

## Rollout gates

- **Gate A — OneLink readiness:** Discovery and JWKS endpoints, secure authorization flow, test clients, and incident controls verified.
- **Gate B — Pilot:** Integrate one lower-risk application and verify sign-in, sign-out, onboarding, tenant isolation, and rollback.
- **Gate C — Church and business apps:** Migrate incrementally with account-linking safeguards and real production monitoring.
- **Gate D — Ecosystem:** Enroll remaining apps through registry and shared integration contract; verify each independently.

## Ownership and architecture boundaries

- **OneLink:** Identity authentication, identity lifecycle, client registry, central security events.
- **Individual apps:** Tenant memberships, business permissions, data, entitlements, app-local sessions.
- **Cloudflare operations:** Infrastructure access and deployment controls; a unified administrative connection must not imply universal runtime privileges.

> This backlog is a recommendation and acceptance plan, not evidence that any listed feature is implemented.
