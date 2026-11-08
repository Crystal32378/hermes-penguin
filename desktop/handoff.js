import {createElement as h,useEffect,useRef,useState} from 'react'
import {calendarRequest,groupRequest,newReviewGate,proposalText} from './handoff-model.js'
import {exportExistingCard} from './card-export.js'

export const handoffCss=`
.penguin-page .p-handoff-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:12px}
.penguin-page .p-handoff{margin-top:18px;border:1px solid #8ea5f2;padding:20px;background:#f4f1e8;border-radius:4px}
.penguin-page .p-handoff .p-row{flex-wrap:wrap}.penguin-page .p-handoff pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:240px;overflow:auto;background:#edf0ff;padding:12px;font:11px ui-monospace,monospace}
.penguin-page .p-handoff .p-export-preview{display:block;max-width:100%;height:auto;margin:12px 0;border:1px solid #8ea5f2}
.penguin-page .p-handoff .p-danger{color:#853b00}.penguin-page .p-handoff button{max-width:100%}
.penguin-page .p-export-card,.penguin-page .p-export-card *{animation:none!important;transition:none!important}
@container(max-width:480px){.penguin-page .p-handoff{padding:14px}.penguin-page .p-handoff .p-fields{grid-template-columns:1fr}}
`
function field(label,value,set,props={}){return h('label',{},label,h('input',{...props,value,onChange:e=>set(e.target.value)}))}
export function OfflineHandoff({ctx,selection,slot,mode,onClose,renderCard,scopeValid=()=>true}){
  const [form,setForm]=useState({platform:'slack',workspace:'',guild:'',channel:'',thread:'',relay:'',title:'Team meeting',account:'',calendar:'',emails:selection.team.members.map(()=>''),discussed:false})
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[draft,setDraft]=useState(null),[exported,setExported]=useState(null),[reviewedDigest,setReviewedDigest]=useState(null)
  const cardRef=useRef(null),gate=useRef(newReviewGate()),currentExport=useRef(null),selectionKey=JSON.stringify(selection),alive=useRef(true)
  function clearExport(){if(currentExport.current){URL.revokeObjectURL(currentExport.current.url);currentExport.current=null}setExported(null)}
  useEffect(()=>{alive.current=true;gate.current=newReviewGate();return()=>{alive.current=false;gate.current.close();if(currentExport.current)URL.revokeObjectURL(currentExport.current.url)}},[])
  function change(key,value){gate.current.invalidate();setBusy(false);setDraft(null);setReviewedDigest(null);setError('');setForm(f=>({...f,[key]:value}))}
  function changePlatform(value){gate.current.invalidate();setBusy(false);setDraft(null);setReviewedDigest(null);setError('');setForm(f=>({...f,platform:value,workspace:'',guild:'',relay:'',channel:'',thread:''}))}
  const valid=()=>alive.current&&scopeValid()
  async function prepare(){
    if(!valid())return
    if(mode==='calendar'&&!form.discussed){setError('Confirm that you reviewed the time with people outside Penguin first.');return}
    const ticket=gate.current.start();setBusy(true);setError('');setDraft(null);setReviewedDigest(null)
    try{
      const body=mode==='share'?groupRequest(selection,slot,form,exported):calendarRequest(selection,form)
      const response=await ctx.rest(mode==='share'?'/handoff/share':'/handoff/calendar',{method:'POST',body})
      if(!gate.current.accept(ticket)||!valid())return
      if(!response.ok)throw Error(response.error?.message||'Please check the draft fields.')
      setDraft(response.result)
    }catch(e){if(gate.current.accept(ticket)&&valid())setError(e.message||'Draft preparation failed. Nothing was sent.')}
    finally{if(gate.current.accept(ticket)&&valid())setBusy(false)}
  }
  async function exportCard(){
    if(!valid())return
    const ticket=gate.current.start();setBusy(true);setError('');setDraft(null);setReviewedDigest(null);clearExport()
    try{
      const image=await exportExistingCard(cardRef.current,{selectionKey,isCurrent:k=>gate.current.accept(ticket)&&valid()&&k===selectionKey})
      if(!gate.current.accept(ticket)||!valid())return
      const item={...image,url:URL.createObjectURL(image.blob)};currentExport.current=item;setExported(item)
    }catch(e){if(gate.current.accept(ticket)&&valid())setError(e.message||'Card export failed. No image was saved or sent.')}
    finally{if(gate.current.accept(ticket)&&valid())setBusy(false)}
  }
  return h('section',{className:'p-handoff','aria-label':mode==='share'?'Offline group sharing review':'Offline calendar invitation review'},
    h('div',{className:'p-row p-between'},h('h2',{},mode==='share'?'Share your existing proposal':'Review a calendar invitation'),h('button',{className:'p-link',onClick:onClose},'Close review')),
    h('p',{className:'p-sub'},'PRIVATE PROTOTYPE · Google, Slack, Buzz and Discord are not connected. Draft fields and candidate-image metadata are checked by your current Hermes gateway; it may be remote. Image bytes stay here. No invitations or group messages can be sent here.'),
    !slot.all_available&&h('p',{className:'p-danger',role:'status'},'Outside saved work hours. Review any exception agreed in your group; Penguin has not checked calendars.'),
    mode==='share'?h('div',{},
      h('p',{className:'p-small'},'Use the existing card below. People discuss and confirm in their group; Penguin does not collect votes.'),
      renderCard(cardRef),
      h('div',{className:'p-handoff-actions'},h('button',{className:'p-secondary',onClick:exportCard,disabled:busy},'Preview PNG export'),
        exported&&h('a',{className:'p-secondary',href:exported.url,download:'penguin-meeting-proposal.png',onClick:e=>{if(!valid()){e.preventDefault();setError('Connection changed. Reopen this review before downloading.')}}},'Download PNG')),
      exported&&h('div',{},h('img',{className:'p-export-preview',src:exported.url,alt:'Local PNG export of the existing Penguin proposal card. Check that names, dates and times are correct.'}),h('p',{className:'p-small'},`${exported.width}×${exported.height} · ${exported.bytes} bytes · Local preview only; not uploaded. Check this image before using it.`)),
      h('p',{className:'p-small'},'Share the PNG with the full proposal text below. The existing picture alone does not show time zones, end times or meeting length.'),
      h('div',{className:'p-fields'},h('label',{},'Group platform',h('select',{value:form.platform,onChange:e=>changePlatform(e.target.value)},h('option',{value:'slack'},'Slack'),h('option',{value:'discord'},'Discord'),h('option',{value:'buzz'},'Buzz'))),
        form.platform==='slack'?field('Workspace ID',form.workspace,v=>change('workspace',v),{placeholder:'Exact T… workspace ID'}):form.platform==='discord'?field('Server ID',form.guild,v=>change('guild',v),{placeholder:'Exact numeric ID'}):field('Buzz community HTTPS URL',form.relay,v=>change('relay',v),{placeholder:'https://community.example'}),
        field(form.platform==='buzz'?'Channel UUID':'Channel ID',form.channel,v=>change('channel',v)),field(form.platform==='slack'?'Thread timestamp (optional)':'Thread ID (optional)',form.thread,v=>change('thread',v))),
      h('p',{className:'p-small'},form.platform==='slack'?'Use a dedicated bot invited to this exact channel. Text uses chat:write; PNG with its caption uses files:write. No history, DMs or Socket Mode is needed for this outbound-only prototype.':form.platform==='discord'?'A community membership is not permission to install a bot. Exact server and channel permissions still need verification.':'Use a dedicated, restricted identity. Community and channel membership still need verification.'),
      h('pre',{'aria-label':'Existing proposal text'},proposalText(slot)))
    :h('div',{},
      h('p',{className:'p-small'},'After the group discussion, enter the agreed people’s email addresses. This does not verify availability or send invitations.'),
      h('div',{className:'p-fields'},field('Meeting title',form.title,v=>change('title',v),{maxLength:160}),field('Organizer Google account',form.account,v=>change('account',v),{type:'email',autoComplete:'off'}),field('App-created secondary Calendar ID',form.calendar,v=>change('calendar',v),{autoComplete:'off',placeholder:'Not primary; no calendar has been connected'}),
        ...selection.team.members.map((m,i)=>h('div',{key:m.name},field(`${m.name} email`,form.emails[i],v=>change('emails',form.emails.map((e,j)=>j===i?v:e)),{type:'email',autoComplete:'off'})))),
      h('label',{},h('input',{type:'checkbox',checked:form.discussed,onChange:e=>change('discussed',e.target.checked)}),' I reviewed this time with the group and want to inspect an invitation draft.'),
      h('p',{className:'p-small'},'Future permission proposal: calendar.app.created only, plus account identity if needed. No Gmail or Drive. This screen grants nothing.'),
      h('pre',{'aria-label':'Selected meeting time'},`${slot.start_utc} → ${slot.end_utc}\n${slot.elapsed_minutes} minutes\n${slot.members.map(m=>`${m.name}: ${m.start.local} → ${m.end.local} (${m.start.zone})`).join('\n')}`)),
    h('div',{className:'p-handoff-actions'},h('button',{className:'p-secondary',disabled:busy||(mode==='calendar'&&!form.discussed),onClick:prepare},busy?'Preparing review…':'Prepare offline review'),h('button',{className:'p-secondary',disabled:true},mode==='share'?'Send unavailable · not connected':'Invite unavailable · not connected')),
    error&&h('div',{className:'p-status',role:'alert'},error),
    draft&&h('div',{role:'status'},h('p',{},'Draft ready for inspection. Nothing was sent to Google, Slack, Buzz or Discord.'),h('pre',{'aria-label':'Offline request review'},JSON.stringify(draft,null,2)),
      mode==='share'&&h('label',{},h('input',{type:'checkbox',checked:reviewedDigest===(draft.plan_digest||draft.review_digest),onChange:e=>{if(valid())setReviewedDigest(e.target.checked?(draft.plan_digest||draft.review_digest):null)}}),draft.share_draft?.attachment?' I checked this exact destination, proposal and candidate image. This records local review only; sending is still disabled.':' I checked this exact destination and text proposal. This records local review only; sending is still disabled.'),
      exported&&mode==='share'&&h('p',{className:'p-small'},`Local candidate image SHA-256: ${exported.sha256}. ${draft.share_draft?.attachment?'Metadata is bound to this review; actual image bytes have not been uploaded.':'This text-only plan does not include the candidate image.'}`)))
}
