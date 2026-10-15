import {configured} from './policy.mjs';
const authFields=['access_token','refresh_token','expires_in','expires_at','token_type','type','error','error_code','error_description','code','token_hash'];
// Consume before any asynchronous work. Never retain refresh tokens or expose callback data.
export function consumeRecoveryLink(location,history,now=Date.now()) {
 const url=new URL(location.href), hash=new URLSearchParams(url.hash.slice(1));
 const present=authFields.some(k=>hash.has(k)||url.searchParams.has(k));
 if(!present)return {kind:'none'};
 const queryAuth=authFields.some(k=>url.searchParams.has(k));
 for(const k of authFields)url.searchParams.delete(k);
 url.hash='';history.replaceState(null,'',url.pathname+url.search);
 const invalid={kind:'invalid'};
 if(hash.has('code')||hash.has('token_hash')||(hash.has('token_type')&&hash.get('token_type').toLowerCase()!=='bearer'))return invalid;
 if(queryAuth||hash.get('type')!=='recovery'||hash.has('error')||hash.has('error_code')||authFields.some(k=>hash.getAll(k).length>1))return invalid;
 const token=hash.get('access_token'), seconds=hash.get('expires_in');
 if(!token||!/^[-A-Za-z0-9._~]+$/.test(token)||token.length>16384||!/^\d+$/.test(seconds||''))return invalid;
 const duration=Number(seconds);if(duration<=0||duration>86400)return invalid;
 let expires=now+duration*1000;
 if(hash.has('expires_at')){const absolute=hash.get('expires_at');if(!/^\d+$/.test(absolute))return invalid;expires=Math.min(expires,Number(absolute)*1000);}
 if(!Number.isFinite(expires)||expires<=now)return invalid;
 return {kind:'recovery',token,expires};
}
export function createRecovery(config,link,{fetcher=fetch,now=()=>Date.now()}={}) {
 let token=link?.kind==='recovery'?link.token:null,expires=link?.expires||0,ready=false,busy=false,generation=0;
 const controller=new AbortController();
 function cancel(){generation++;token=null;expires=0;ready=false;controller.abort();}
 function valid(){if(!configured(config)||!token||now()>=expires){cancel();throw Error('重设链接无效或已过期，请重新申请邮件');}}
 async function request(path,method='GET',body){valid();const version=generation;const r=await fetcher(config.url+path,{method,headers:{apikey:config.publishableKey,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,credentials:'omit',cache:'no-store',signal:controller.signal});if(version!==generation)throw Error('重设已取消');valid();const d=await r.json().catch(()=>null);if(version!==generation)throw Error('重设已取消');valid();if(!r.ok)throw Error(method==='PUT'?'密码未能更新，请检查密码要求或重新申请邮件':'重设链接验证失败，请重新申请邮件');return d;}
 return {
  cancel,
  async verify(){if(ready||busy)throw Error('请勿重复验证');busy=true;try{const user=await request('/auth/v1/user');if(!user?.id||user.is_anonymous)throw Error('账号验证失败');const members=await request('/rest/v1/desk_members?select=user_id&active=eq.true');if(!Array.isArray(members)||!members.some(x=>x.user_id===user.id))throw Error('该账号没有工作区权限');ready=true;return true;}catch(e){cancel();throw e;}finally{busy=false;}},
  async submit(password,confirmation){valid();if(!ready||busy)throw Error('请先完成重设链接验证');if(typeof password!=='string'||password.length<8||password.length>128)throw Error('新密码需 8–128 个字符');if(password!==confirmation)throw Error('两次输入的密码不一致');busy=true;try{await request('/auth/v1/user','PUT',{password});cancel();return true;}finally{busy=false;}}
 };
}
