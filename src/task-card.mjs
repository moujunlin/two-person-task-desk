import {labels} from './policy.mjs';
export const DETAIL_MARKER='\n\n【详细记录】\n';
const el=(tag,text='',className='')=>{const node=document.createElement(tag);node.textContent=text;node.className=className;return node;};
// Only presentation is split. Original whitespace and untrusted text are retained.
export function splitRecord(text){const at=text.indexOf(DETAIL_MARKER);return at<0?{summary:text,detail:null}:{summary:text.slice(0,at),detail:text.slice(at+DETAIL_MARKER.length)};}
export function appendParagraphs(container,text){for(const part of text.split(/(\n\n+)/)){if(!part)continue;container.append(el(/^\n+$/.test(part)?'span':'p',part,/^\n+$/.test(part)?'paragraph-gap':'record-paragraph'));}}
export function renderComment(comment){const item=el('div','','comment');appendParagraphs(item,comment.body);return item;}
export function renderTaskCard(task){
 const article=el('article','','task-card');
 const header=el('header','','task-header');header.append(el('h3',task.title,'task-title'));
 const known=Object.hasOwn(labels,task.state);header.append(el('span',known?labels[task.state]:'未知状态',`state-badge state-${known?task.state:'unknown'}`));article.append(header);
 const date=new Date(task.created_at);article.append(el('p',`提交时间：${Number.isNaN(date.getTime())?task.created_at:date.toLocaleString()}`,'task-meta'));
 const block=(title,kind)=>{const section=el('section','',`task-block ${kind}`);section.append(el('h4',title,'block-title'));article.append(section);return section;};
 const request=block('任务要求','request-block');appendParagraphs(request,task.details);
 const record=block('dot 回复 · 执行记录','reply-block');
 if(task.result){const {summary,detail}=splitRecord(task.result);appendParagraphs(record,summary);if(detail!==null){const details=el('details','','record-details');details.append(el('summary','技术细节与交付记录'));const body=el('div','','detail-body');appendParagraphs(body,detail);details.append(body);record.append(details);}}
 else record.append(el('p','暂时还没有回复或执行记录。','empty-state'));
 record.append(el('p','状态对应本条任务；具体完成范围请以回复内容为准。','scope-note'));
 if(task.evidence_url){try{const url=new URL(task.evidence_url);if(url.protocol==='https:'){const evidence=block('交付与证据','evidence-block');const a=el('a','打开交付内容 ↗','evidence-link');a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';evidence.append(a);}}catch{}}
 const discussion=block('成员讨论','discussion-block');const show=el('button','查看讨论','discussion-toggle');show.type='button';const comments=el('div','','comments');discussion.append(show,comments);
 return {article,show,comments};
}
