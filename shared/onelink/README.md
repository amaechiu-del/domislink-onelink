# OneLink shared integration — foundation

This is a **shared contract library**, not a deployed identity provider or an authorization server. It has no runtime dependencies and is currently hosted in `domislink-app` for integration planning.

## Registry

```js
import { ApplicationRegistry } from './application-registry.mjs';
const registry = new ApplicationRegistry([
  {
    clientId: 'domislink-church',
    owner: 'DomisLink Church',
    redirectUris: ['https://church.domislink.com/auth/callback'],
    postLogoutRedirectUris: ['https://church.domislink.com/'],
    allowedScopes: ['openid', 'profile', 'email'],
    enabled: true,
  },
]);
```

The example is a **sample registration**, not proof that the live gateway has registered the client. Registry changes must be restricted to trusted administrators and persisted in an audited database before production use. This in-memory implementation is not a shared distributed registry.

## OIDC authorization request

```js
import { createAuthorizationRequest, validateAuthorizationCallback } from './oidc-contract.mjs';
const request = await createAuthorizationRequest({
  registry,
  clientId: 'domislink-church',
  redirectUri: 'https://church.domislink.com/auth/callback',
  issuer: 'https://sso.domislink.com',
  scopes: ['openid', 'profile'],
});
// Persist verifier/state/nonce in a protected short-lived server-side login transaction.
// Redirect browser to request.authorizationUrl.
// On return, validateAuthorizationCallback(callbackUrl, request.state).
```

**Before production:** Verify the actual discovery document's `authorization_endpoint` and use that endpoint rather than assuming `/authorize`; implement code exchange with PKCE, issuer/audience/expiry/signature validation via a vetted OIDC library, nonce verification, session management, replay protection, CSRF defenses, and refresh/logout policy. This module intentionally does not parse or trust JWTs.

## Tests

```bash
node --test tests/onelink-integration.test.mjs
```

## Next integration

Move registry persistence and administrative authorization to the live OneLink gateway, connect the SDK to its discovery/JWKS endpoints, and pilot Church with tenant-isolation tests. Never grant app membership merely because a OneLink identity exists.
