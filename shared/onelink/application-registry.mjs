/**
 * OneLink client registry contract. This module holds no client secrets.
 * Only administrator-approved records may be registered; never accept self-registration publicly.
 */
const clientIdPattern = /^[a-z][a-z0-9._-]{2,79}$/;
const scopes = new Set(['openid', 'profile', 'email', 'offline_access']);
function exactHttpsUri(value, label, allowLoopback = false) {
  if (typeof value !== 'string' || value.includes('*') || value.includes('#')) throw new Error(`Invalid ${label}`);
  let u;
  try { u = new URL(value); } catch { throw new Error(`Invalid ${label}`); }
  const loopback = allowLoopback && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
  if (u.protocol !== 'https:' && !(loopback && u.protocol === 'http:')) throw new Error(`${label} must use HTTPS`);
  if (u.username || u.password || !u.hostname || u.hash) throw new Error(`Invalid ${label}`);
  return u.href;
}
export function validateClient(input, { allowLoopback = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Client must be an object');
  const { clientId, owner, redirectUris, postLogoutRedirectUris = [], allowedScopes = ['openid'], enabled = false } = input;
  if (typeof clientId !== 'string' || !clientIdPattern.test(clientId)) throw new Error('Invalid client ID');
  if (typeof owner !== 'string' || !owner.trim()) throw new Error('Client owner required');
  if (!Array.isArray(redirectUris) || redirectUris.length < 1 || redirectUris.length > 20) throw new Error('Redirect URI list required');
  if (!Array.isArray(postLogoutRedirectUris) || postLogoutRedirectUris.length > 20) throw new Error('Invalid logout URIs');
  if (!Array.isArray(allowedScopes) || !allowedScopes.includes('openid') || allowedScopes.some(s => !scopes.has(s))) throw new Error('Invalid OIDC scopes');
  const redirects = redirectUris.map(u => exactHttpsUri(u, 'redirect URI', allowLoopback));
  const logouts = postLogoutRedirectUris.map(u => exactHttpsUri(u, 'logout URI', allowLoopback));
  if (new Set(redirects).size !== redirects.length || new Set(logouts).size !== logouts.length) throw new Error('Duplicate URIs');
  if (typeof enabled !== 'boolean') throw new Error('Invalid enabled flag');
  return Object.freeze({ clientId, owner: owner.trim(), redirectUris: Object.freeze(redirects), postLogoutRedirectUris: Object.freeze(logouts), allowedScopes: Object.freeze([...new Set(allowedScopes)]), enabled });
}
export class ApplicationRegistry {
  #clients = new Map();
  constructor(approvedClients = []) {
    for (const client of approvedClients) this.register(client);
  }
  register(input, options) {
    const client = validateClient(input, options);
    if (this.#clients.has(client.clientId)) throw new Error('Client already registered');
    this.#clients.set(client.clientId, client);
    return client;
  }
  get(clientId) { return this.#clients.get(clientId) ?? null; }
  authorize({ clientId, redirectUri, requestedScopes }) {
    const client = this.get(clientId);
    if (!client?.enabled) throw new Error('Client not enabled or unknown');
    const uri = exactHttpsUri(redirectUri, 'redirect URI');
    if (!client.redirectUris.includes(uri)) throw new Error('Unregistered redirect URI');
    if (!Array.isArray(requestedScopes) || !requestedScopes.includes('openid') || requestedScopes.some(s => !client.allowedScopes.includes(s))) throw new Error('Scope not allowed');
    return client;
  }
  list() { return [...this.#clients.values()]; }
}
