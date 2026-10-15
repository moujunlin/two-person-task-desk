import {configured} from './policy.mjs';
export function createBackend(config) {
 if(!configured(config)) return null;
 let token=null, user=null, expires=0;
 async function request(path,{method='GET',body,auth=true}={}) {
  if(auth&&(!token||Date.now()>=expires)) {clear(); throw Error('会话已过期，请重新登录');}
  const r=await fetch(config.url+path,{method,headers:{apikey:config.publishableKey,'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',credentials:'omit'});
  const data=await r.json().catch(()=>null);
  if(!r.ok) {if(r.status===401)clear(); const e=Error(r.status===401?'请重新登录':'请求未成功，请稍后重试');e.status=r.status;e.code=data?.code;throw e;}
  return data;
 }
 function clear(){token=null;user=null;expires=0;}
 return {
  async login(email,password){clear();const d=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password},auth:false}); token=d.access_token;user=d.user;expires=Date.now()+d.expires_in*1000;try{const m=await request('/rest/v1/desk_members?select=user_id&active=eq.true');if(!m?.some(x=>x.user_id===user.id))throw Error('该账号没有工作区权限');return user.id;}catch(e){clear();throw e;}},
  async logout(){try{if(token)await request('/auth/v1/logout',{method:'POST'});}finally{clear();}},
  async tasks(){return request('/rest/v1/desk_tasks?select=id,owner_id,title,details,state,result,evidence_url,created_at&order=created_at.desc&limit=100');},
  async comments(taskId){return request(`/rest/v1/desk_comments?select=id,author_id,body,created_at&task_id=eq.${encodeURIComponent(taskId)}&order=created_at.asc&limit=100`);},
  async submit(task,key){try{await request('/rest/v1/desk_tasks',{method:'POST',body:{...task,owner_id:user.id,request_key:key}});}catch(e){if(e.code!=='23505')throw e;const r=await request(`/rest/v1/desk_tasks?select=title,details&owner_id=eq.${user.id}&request_key=eq.${key}`);if(r?.length!==1||r[0].title!==task.title||r[0].details!==task.details)throw Error('重复请求内容不一致，请重新提交');}},
  async comment(taskId,body,key){if(!body.trim()||body.trim().length>4000)throw Error('评论需 1–4000 字');try{await request('/rest/v1/desk_comments',{method:'POST',body:{task_id:taskId,author_id:user.id,body:body.trim(),request_key:key}});}catch(e){if(e.code!=='23505')throw e;const r=await request(`/rest/v1/desk_comments?select=body,task_id&author_id=eq.${user.id}&request_key=eq.${key}`);if(r?.length!==1||r[0].body!==body.trim()||r[0].task_id!==taskId)throw Error('重复评论内容不一致');}}
 };
}
