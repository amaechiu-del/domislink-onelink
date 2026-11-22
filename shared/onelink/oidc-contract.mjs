/**
 * Browser-facing OIDC authorization-code + PKCE contract.
 * Token signature/issuer/audience verification must happen server-side with a vetted OIDC library.
 */
import { ApplicationRegistry } from './application-registry.mjs';
function requiredString(value, name) {
  if (typeof value !== 'string' || !value) throw new Error(`Missing ${name}`);
  return value;
}
function base64url(bytes) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = '', bits = 0, buffer = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 6) { bits -= 6; result += chars[(buffer >>> bits) & 63]; }
  }
  if (bits > 0) result += chars[(buffer << (6 - bits)) & 63];
  return result;
}
function randomToken() {
  if (!globalThis.crypto?.getRandomValues) throw new Error('Secure random unavailable');
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return base64url(bytes);
}
export async function pkceChallenge(verifier) {
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(requiredString(verifier, 'verifier'))) throw new Error('Invalid PKCE verifier');
  if (!globalThis.crypto?.subtle) throw new Error('SHA-256 unavailable');
  return base64url(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
}
export async function createAuthorizationRequest({ registry, clientId, redirectUri, issuer, scopes = ['openid'], loginHint }) {
  if (!(registry instanceof ApplicationRegistry)) throw new Error('Registry required');
  registry.authorize({ clientId, redirectUri, requestedScopes: scopes });
  const issuerUrl = new URL(requiredString(issuer, 'issuer'));
  if (issuerUrl.protocol !== 'https:' || issuerUrl.username || issuerUrl.password || issuerUrl.search || issuerUrl.hash) throw new Error('Invalid issuer');
  const verifier = randomToken(), state = randomToken(), nonce = randomToken();
  const url = new URL('oauth/authorize', issuerUrl.href.endsWith('/') ? issuerUrl.href : issuerUrl.href + '/');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scopes.join(' '));
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('code_challenge', await pkceChallenge(verifier));
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);
  if (loginHint) url.searchParams.set('login_hint', loginHint);
  return { authorizationUrl: url.href, verifier, state, nonce };
}
export function validateAuthorizationCallback(callbackUrl, expectedState) {
  const url = new URL(requiredString(callbackUrl, 'callback URL'));
  if (!requiredString(expectedState, 'expected state')) throw new Error('Missing state');
  if (url.searchParams.has('error')) throw new Error('Authorization rejected');
  const code = url.searchParams.get('code'), state = url.searchParams.get('state');
  if (!code || !state || state !== expectedState || url.searchParams.getAll('state').length !== 1 || url.searchParams.getAll('code').length !== 1) throw new Error('Invalid authorization callback');
  return { code };
}
/**
 * After callback validation, a backend must exchange the code with the saved verifier
 * and validate ID tokens against discovery/JWKS using a vetted OIDC implementation.
 * Do not treat the authorization code or decoded JWT payload as proof of identity.
 */
