import {createClient} from 'npm:@supabase/supabase-js@2.112.3';
import {createHandler} from './handler.mjs';
const url=Deno.env.get('SUPABASE_URL')!;
const key=Deno.env.get('SUPABASE_ANON_KEY')!;
const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(createHandler({
 async checkDatabase(){
  const {error}=await admin.from('profiles').select('id').limit(1);
  return !error;
 },
 async identify(token){
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${token}`}}});
  const {data,error}=await client.auth.getUser(token);
  if(error||!data.user)return null;
  const result=await client.from('profiles').select('account_status').eq('id',data.user.id).single();
  if(result.error)throw new Error('Profile read unavailable');
  return {active:result.data.account_status==='active'};
 }
}));
