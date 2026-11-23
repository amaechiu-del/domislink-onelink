// Public-safe bootstrap metadata. This is not a live health feed or an authorization source.
export const centralServices=Object.freeze([
{id:'sso',name:'SSO Gateway',category:'Identity',purpose:'Only OIDC issuer: tokens, JWKS and sessions',lifecycle:'migration'},
{id:'onelink',name:'OneLink',category:'Accounts',purpose:'Account experience, application access and control centre',lifecycle:'development'},
{id:'paystack',name:'Paystack Central',category:'Payments',purpose:'Checkout, webhook verification, billing and reconciliation',lifecycle:'integration pending'},
{id:'whatsapp',name:'WhatsApp Command Centre',category:'Communications',purpose:'WhatsApp API transport, templates and AI messaging',lifecycle:'integration pending'},
{id:'adstudio',name:'AdStudio',category:'Marketing',purpose:'Campaigns, moderation and approvals',lifecycle:'planned'},
{id:'messaging',name:'Communications Centre',category:'Communications',purpose:'Email, SMS, Telegram, push and voice providers',lifecycle:'planned'},
{id:'ai-studio',name:'AI Studio',category:'AI',purpose:'AI agents and application development',lifecycle:'planned'},
{id:'branding',name:'Branding Centre',category:'Platform',purpose:'Brand kits, themes and reusable templates',lifecycle:'planned'},
{id:'releases',name:'PWA & Release Centre',category:'Platform',purpose:'Build, deployment and release governance',lifecycle:'planned'},
{id:'configuration',name:'Configuration Centre',category:'Security',purpose:'Protected configuration and secret references',lifecycle:'planned'},
{id:'social',name:'Social Media Centre',category:'Marketing',purpose:'Publishing and scheduled campaigns',lifecycle:'planned'},
{id:'analytics',name:'Analytics & Audit',category:'Observability',purpose:'Telemetry and audited service activity',lifecycle:'planned'},
{id:'registry',name:'Services Registry',category:'Platform',purpose:'Service metadata, dependencies and authorized integrations',lifecycle:'development'}]);
export function selectServices(items,{query='',category='all'}={}){const q=query.trim().toLowerCase();return items.filter(s=>(category==='all'||s.category===category)&&(!q||[s.name,s.purpose,s.category,s.id].some(v=>v.toLowerCase().includes(q))))}
