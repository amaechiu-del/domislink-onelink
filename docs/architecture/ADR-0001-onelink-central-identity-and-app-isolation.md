# Architecture Decision Record 0001: OneLink identity and DomisLink application ecosystem

- **Status:** Accepted
- **Date:** 2026-11-22
- **Scope:** DomisLink ecosystem, including existing and future applications
- **Decision owner:** DomisLink

## Decision

**OneLink is the central identity service. DomisLink Apps are the connected application ecosystem.**

DomisLink applications may operate under **one Cloudflare account and one administrative integration**, but must not be required to share a database, a Worker, or unrestricted permissions.

**OneLink must not compete with application registration systems.** A person registers a central identity once through OneLink, and each participating application provisions its own authorized application profile, tenant membership, or workspace as needed.

## Responsibilities

### OneLink (identity provider)
- Central sign-up and sign-in, identity verification, recovery, and authentication sessions.
- Standards-based OIDC/OAuth authorization-code flow with PKCE for participating browser applications.
- Stable, non-reassignable subject identifier (`sub`) for each identity.
- Central account lifecycle and authentication policies.
- MFA, passkeys/WebAuthn, Google sign-in, and OTP methods only when individually configured and verified.
- Identity claims only; no automatic grant of business roles or tenant access.

### DomisLink Apps (relying parties)
- Redirect users to OneLink for authentication; validate issuer, audience, signature, expiry, nonce/state, and PKCE as applicable.
- Link the verified OneLink `sub` to an application-local user record.
- Create an application profile or workspace only through an explicit, authorized onboarding flow.
- Keep roles, tenant membership, subscription entitlements, application permissions, and business records under application control.
- Enforce tenant isolation and least-privilege access on every API operation.
- Do not store or independently manage OneLink passwords.
- Provide safe linking and migration for legacy accounts; never auto-merge users solely on matching email addresses.

### Cloudflare administration
- One Cloudflare account and a centralized administrative integration may manage multiple apps.
- Each app may have separate Workers, D1 databases, R2 buckets, environment secrets, DNS routes, and deployment pipelines.
- Production tokens should be scoped to the minimum required account/zone resources and operations; use distinct deployment credentials when isolation requires it.
- WAF exceptions must be narrowly scoped to a verified rule and relevant hostname; do not disable protection globally.

## User journey

1. User opens a participating DomisLink application.
2. The application starts an OIDC sign-in at OneLink.
3. OneLink authenticates the user or offers central identity registration.
4. The application validates the authentication response and resolves the OneLink subject.
5. The application looks up or provisions its own user profile and, only when authorized, a tenant/workspace.
6. The application independently checks roles, entitlements, and tenant membership before granting access.

## Constraints and rollout

- OneLink identity does **not** imply membership in every application or tenant.
- Existing application users must have a deliberate account-linking and migration path.
- Cross-domain and cross-subdomain sessions must use secure, correctly scoped cookies and OIDC redirects; do not assume cookies work across `domislink.com` and `domislinker.com`.
- A single administrative integration is a management choice, not a shared runtime or authorization boundary.
- This ADR records the target architecture; it does not assert that all applications have completed OneLink integration.

## Acceptance criteria

- A user can authenticate centrally and access two participating apps without creating separate passwords.
- Each app creates its own authorized profile/workspace and enforces independent tenant membership.
- A user with access to App A cannot gain access to App B merely by possessing a valid OneLink session.
- Sign-out, token expiry, account suspension, and recovery are handled safely.
- Cloudflare resources remain isolated and independently deployable.
