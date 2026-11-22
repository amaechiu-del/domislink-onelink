import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../services/onelink-registry/src/index.mjs';
const token='a'.repeat(40);
function mockDb() {
 const records=new Map(),audit=[];
 return {records,audit,prepare(sql) {
  let params=[];
  return {
   bind(...v){params=v;return this},
   async first(){return records.get(params[0])??null},
   async all(){return {results:[...records.keys()].map(client_id=>({client_id}))}},
   async run(){
    if(sql.startsWith('INSERT INTO oidc_clients')) {
     const [client_id,owner,redirect_uris_json,logout_uris_json,allowed_scopes_json,enabled]=params;
     if(records.has(client_id))throw new Error('duplicate');
     records.set(client_id,{client_id,owner,redirect_uris_json,logout_uris_json,allowed_scopes_json,enabled});
    } else if(sql.startsWith('UPDATE oidc_clients')) {
     const [owner,redirect_uris_json,logout_uris_json,allowed_scopes_json,enabled,client_id]=params;
     records.set(client_id,{client_id,owner,redirect_uris_json,logout_uris_json,allowed_scopes_json,enabled});
    } else if(sql.startsWith('INSERT INTO oidc_client_audit'))audit.push(params);
   }
  };
 },async batch(stmts){for(const stmt of stmts)await stmt.run()}};
}
const env={DB:mockDb(),REGISTRY_ADMIN_TOKEN:token};
const request=(path,method='GET',body,authorization='Bearer '+token)=>new Request('https://registry.example'+path,{method,headers:{authorization,'content-type':'application/json'},body:body?JSON.stringify(body):undefined});
test('registry health and authorization',async()=>{
 assert.equal((await worker.fetch(request('/health'),env)).status,200);
 assert.equal((await worker.fetch(request('/admin/clients','GET',undefined,'Bearer wrong'),env)).status,401);
 assert.equal((await worker.fetch(request('/admin/clients','GET'),{DB:env.DB})).status,401);
});
test('persist approved clients and reject unsafe redirects',async()=>{
 const client={clientId:'domislink-church',owner:'Church',redirectUris:['https://church.domislink.com/auth/callback'],allowedScopes:['openid'],enabled:false};
 assert.equal((await worker.fetch(request('/admin/clients','POST',{...client,redirectUris:['https://*.domislink.com/cb']}),env)).status,400);
 const created=await worker.fetch(request('/admin/clients','POST',client),env);
 assert.equal(created.status,201);
 assert.equal(env.DB.records.size,1);
 assert.equal(env.DB.audit.length,1);
 const updated=await worker.fetch(request('/admin/clients/domislink-church','PATCH',{enabled:true}),env);
 assert.equal(updated.status,200);
 assert.equal((await updated.json()).client.enabled,true);
 assert.equal(env.DB.audit.length,2);
});
