const headers = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'GET, OPTIONS','X-Content-Type-Options':'nosniff'};
export function createHandler({checkDatabase,identify}) {
 const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
 return async req=>{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='GET')return json({ok:false,code:'METHOD_NOT_ALLOWED'},405);
  const path=new URL(req.url).pathname.replace(/\/$/,'');
  try {
   if(path.endsWith('/health')) {
    if(!await checkDatabase())return json({ok:false,status:'unavailable'},503);
    return json({ok:true,service:'orange-cloud-bootstrap',apiVersion:1,status:'ready',stage:'connectivity-test',hotUpdatesReady:false,cloudBrowserReady:false});
   }
   if(!path.endsWith('/bootstrap'))return json({ok:false,code:'NOT_FOUND'},404);
   const bearer=req.headers.get('authorization')||'';
   if(!/^Bearer\s+\S+$/i.test(bearer))return json({ok:false,code:'UNAUTHENTICATED'},401);
   const identity=await identify(bearer.replace(/^Bearer\s+/i,''));
   if(!identity)return json({ok:false,code:'UNAUTHENTICATED'},401);
   if(!identity.active)return json({ok:false,code:'ACCOUNT_DISABLED'},403);
   return json({ok:true,apiVersion:1,capabilities:{hotUpdates:false,accountDataSync:false,cloudBrowser:false},release:null});
  } catch {return json({ok:false,code:'SERVICE_UNAVAILABLE'},503);}
 };
}
