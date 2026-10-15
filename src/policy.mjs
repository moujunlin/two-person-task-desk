export function validateTask(title, details) {
  title=title.trim(); details=details.trim();
  if (!title || title.length>120 || !details || details.length>12000) throw Error('标题需 1–120 字，详情需 1–12000 字');
  return {title,details};
}
export function configured(c) { try {const u=new URL(c.url); return c.enabled===true && u.protocol==='https:' && /^[a-z0-9]+\.supabase\.co$/.test(u.hostname) && /^sb_publishable_[A-Za-z0-9_-]+$/.test(c.publishableKey);}catch{return false;} }
export const labels={submitted:'已提交，尚未接单',working:'实际处理中',done:'已完成',failed:'执行失败'};
