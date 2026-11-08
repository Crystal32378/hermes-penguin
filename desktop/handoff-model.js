// Pure offline form builders. No credentials, localStorage or external transport.
export function proposalText(slot) {
  return ['Meeting proposal · Penguin', `${slot.elapsed_minutes} minutes · ${slot.start_utc} → ${slot.end_utc}`,
    ...slot.members.map(m=>`${m.name}: ${m.start.local} → ${m.end.local} (${m.start.zone})`),
    'Please confirm availability. No calendar event has been created.',
    ...(!slot.all_available?['Note: this time is outside at least one member’s work hours.']:[])].join('\n')
}
export function groupRequest(selection,slot,form,exported=null) {
  let target
  if(form.platform==='buzz')target={platform:'buzz',relay_url:form.relay,channel_id:form.channel,...(form.thread?{thread_root_id:form.thread}:{})}
  else if(form.platform==='slack')target={platform:'slack',workspace_id:form.workspace,channel_id:form.channel,...(form.thread?{thread_ts:form.thread}:{})}
  else if(form.platform==='discord')target={platform:'discord',guild_id:form.guild,channel_id:form.channel,...(form.thread?{thread_id:form.thread}:{})}
  else throw Error('Choose Slack, Discord or Buzz explicitly.')
  const body={selection,copied_proposal:proposalText(slot),target}
  if(exported&&form.platform==='slack'){
    if(exported.selectionKey!==JSON.stringify(selection))throw Error('Image belongs to another selected time. Export again.')
    body.export_manifest={selection,sha256:exported.sha256,bytes:exported.bytes,width:exported.width,height:exported.height}
  }
  return body
}
export function calendarRequest(selection,form) {
  return {selection,title:form.title,google:{account_email:form.account,calendar_id:form.calendar,send_updates:'all',
    attendees:selection.team.members.map((m,i)=>({member_name:m.name,email:form.emails[i]||''}))}}
}
export function reviewKey(selection,form) { return JSON.stringify({selection,form}) }
export function newReviewGate(){
  let current=0,live=true
  return {start:()=>++current,invalidate:()=>{current++},accept:n=>live&&n===current,close:()=>{live=false;current++}}
}
