import { ApplicationRegistry, validateClient } from '../../../shared/onelink/application-registry.mjs';
const json = (value, status=200) => new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const unauthorized = () => json({error:'unauthorized'},401);
function constantTimeEqual(a,b) {
 const x=new TextEncoder().encode(a), y=new TextEncoder().encode(b);
 let diff=x.length^y.length;
 for(let i=0;i<Math.max(x.length,y.length);i++) diff|=(x[i]??0)^(y[i]??0);
 return diff===0;
}
function authorizeAdmin(request,env) {
 const expected=env.REGISTRY_ADMIN_TOKEN;
 const supplied=request.headers.get('authorization');
 return typeof expected==='string'&&expected.length>=32&&typeof supplied==='string'&&supplied.startsWith('Bearer ')&&constantTimeEqual(supplied.slice(7),expected);
}
async function getClient(env,id) {
 const row=await env.DB.prepare('SELECT * FROM oidc_clients WHERE client_id = ?').bind(id).first();
 if(!row)return null;
 return validateClient({clientId:row.client_id,owner:row.owner,redirectUris:JSON.parse(row.redirect_uris_json),postLogoutRedirectUris:JSON.parse(row.logout_uris_json),allowedScopes:JSON.parse(row.allowed_scopes_json),enabled:row.enabled===1});
}
export default {
 async fetch(request,env) {
  const url=new URL(request.url);
  if(url.pathname==='/health'&&request.method==='GET')return json({ok:true,service:'onelink-client-registry'});
  if(!url.pathname.startsWith('/admin/'))return json({error:'not_found'},404);
  if(!authorizeAdmin(request,env))return unauthorized();
  if(!env.DB)return json({error:'database_unavailable'},503);
  try {
   if(url.pathname==='/admin/clients'&&request.method==='GET') {
    const rows=await env.DB.prepare('SELECT client_id FROM oidc_clients ORDER BY client_id LIMIT 200').all();
    const clients=await Promise.all(rows.results.map(row=>getClient(env,row.client_id)));
    return json({clients});
   }
   if(url.pathname==='/admin/clients'&&request.method==='POST') {
    const raw=await request.text();
    if(raw.length>16384)return json({error:'payload_too_large'},413);
    const client=validateClient(JSON.parse(raw));
    const actor='registry-admin-token';
    const statements=[
     env.DB.prepare('INSERT INTO oidc_clients(client_id,owner,redirect_uris_json,logout_uris_json,allowed_scopes_json,enabled) VALUES(?,?,?,?,?,?)').bind(client.clientId,client.owner,JSON.stringify(client.redirectUris),JSON.stringify(client.postLogoutRedirectUris),JSON.stringify(client.allowedScopes),client.enabled?1:0),
     env.DB.prepare('INSERT INTO oidc_client_audit(client_id,action,actor) VALUES(?,?,?)').bind(client.clientId,'create',actor),
    ];
    await env.DB.batch(statements);
    return json({client},201);
   }
   const match=url.pathname.match(/^\/admin\/clients\/([a-z][a-z0-9._-]{2,79})$/);
   if(match&&request.method==='GET') {
    const client=await getClient(env,match[1]);
    return client?json({client}):json({error:'not_found'},404);
   }
   if(match&&request.method==='PATCH') {
    const current=await getClient(env,match[1]);
    if(!current)return json({error:'not_found'},404);
    const raw=await request.text();
    if(raw.length>16384)return json({error:'payload_too_large'},413);
    const changes=JSON.parse(raw);
    if(Object.keys(changes).some(k=>!['owner','redirectUris','postLogoutRedirectUris','allowedScopes','enabled'].includes(k)))return json({error:'unsupported_field'},400);
    const client=validateClient({...current,...changes,clientId:current.clientId});
    await env.DB.batch([
     env.DB.prepare('UPDATE oidc_clients SET owner=?,redirect_uris_json=?,logout_uris_json=?,allowed_scopes_json=?,enabled=?,updated_at=CURRENT_TIMESTAMP WHERE client_id=?').bind(client.owner,JSON.stringify(client.redirectUris),JSON.stringify(client.postLogoutRedirectUris),JSON.stringify(client.allowedScopes),client.enabled?1:0,client.clientId),
     env.DB.prepare('INSERT INTO oidc_client_audit(client_id,action,actor) VALUES(?,?,?)').bind(client.clientId,'update','registry-admin-token'),
    ]);
    return json({client});
   }
   return json({error:'not_found'},404);
  } catch(e) {
   if(e instanceof SyntaxError||/Invalid|Duplicate|Missing|must use|already registered|required|scope/i.test(e.message))return json({error:'invalid_request',message:e.message},400);
   return json({error:'internal_error'},500);
  }
 }
};
