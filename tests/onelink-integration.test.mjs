import test from 'node:test';
import assert from 'node:assert/strict';
import { ApplicationRegistry, validateClient } from '../shared/onelink/application-registry.mjs';
import { createAuthorizationRequest, validateAuthorizationCallback, pkceChallenge } from '../shared/onelink/oidc-contract.mjs';
const approved = { clientId:'domislink-church', owner:'Church', redirectUris:['https://church.domislink.com/auth/callback'], allowedScopes:['openid','profile'], enabled:true };
test('registry rejects insecure, wildcard and duplicate redirect URLs', () => {
 for (const uri of ['http://church.domislink.com/cb','https://*.domislink.com/cb','https://church.domislink.com/cb#frag']) {
  assert.throws(() => validateClient({...approved,redirectUris:[uri]}));
 }
 assert.throws(() => validateClient({...approved,redirectUris:[approved.redirectUris[0],approved.redirectUris[0]]}));
});
test('unknown and disabled clients fail closed', () => {
 const registry = new ApplicationRegistry([{...approved,enabled:false}]);
 assert.throws(() => registry.authorize({clientId:approved.clientId,redirectUri:approved.redirectUris[0],requestedScopes:['openid']}));
 assert.throws(() => registry.authorize({clientId:'unknown',redirectUri:approved.redirectUris[0],requestedScopes:['openid']}));
});
test('registry enforces exact redirect and approved scopes', () => {
 const registry = new ApplicationRegistry([approved]);
 assert.throws(() => registry.authorize({clientId:approved.clientId,redirectUri:'https://evil.example/cb',requestedScopes:['openid']}));
 assert.throws(() => registry.authorize({clientId:approved.clientId,redirectUri:approved.redirectUris[0],requestedScopes:['openid','email']}));
 assert.equal(registry.authorize({clientId:approved.clientId,redirectUri:approved.redirectUris[0],requestedScopes:['openid']}).clientId,approved.clientId);
});
test('PKCE challenge matches RFC 7636 sample', async () => {
 assert.equal(await pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
});
test('authorization request uses S256, random state and nonce', async () => {
 const registry = new ApplicationRegistry([approved]);
 const request = await createAuthorizationRequest({registry,clientId:approved.clientId,redirectUri:approved.redirectUris[0],issuer:'https://sso.domislink.com',scopes:['openid']});
 const url = new URL(request.authorizationUrl);
 assert.equal(url.origin,'https://sso.domislink.com');
 assert.equal(url.searchParams.get('response_type'),'code');
 assert.equal(url.searchParams.get('code_challenge_method'),'S256');
 assert.equal(url.searchParams.get('code_challenge'),await pkceChallenge(request.verifier));
 assert.notEqual(request.state,request.nonce);
 assert.deepEqual(validateAuthorizationCallback('https://church.domislink.com/auth/callback?code=abc&state='+request.state,request.state),{code:'abc'});
 assert.throws(()=>validateAuthorizationCallback('https://church.domislink.com/auth/callback?code=abc&state=wrong',request.state));
});
