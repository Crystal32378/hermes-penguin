// Static React render only: not a browser or a screenshot/layout test.
import {createElement as h} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import assert from 'node:assert/strict'
import {OfflineHandoff} from '../desktop/handoff.js'
const selection={team:{members:[{name:'A'}]},local_time:'2026-11-16T21:00'}
const slot={elapsed_minutes:60,start_utc:'2026-11-16T13:00Z',end_utc:'2026-11-16T14:00Z',all_available:true,members:[{name:'A',start:{local:'2026-11-16T21:00+08:00',zone:'Asia/Taipei'},end:{local:'2026-11-16T22:00+08:00'}}]}
let calls=0
for(const mode of ['share','calendar']){
 const html=renderToStaticMarkup(h(OfflineHandoff,{ctx:{rest:()=>{calls++;throw Error('no calls during render')}},selection,slot,mode,onClose:()=>{},renderCard:ref=>h('section',{className:'p-sendoff',ref},'EXISTING-CARD-COMPONENT')}))
 assert.match(html,/PRIVATE PROTOTYPE/);assert.match(html,/not connected/);assert.match(html,/disabled/);assert.ok(!html.includes('type="password"'))
 if(mode==='share'){assert.match(html,/EXISTING-CARD-COMPONENT/);assert.match(html,/Preview PNG export/);assert.match(html,/Workspace ID/);assert.ok(!html.includes('Organizer Google account'))}
 else {assert.match(html,/A email/);assert.match(html,/calendar.app.created/);assert.match(html,/checked calendars|availability/);assert.ok(!html.includes('EXISTING-CARD-COMPONENT'))}
}
assert.equal(calls,0)
console.log('2 static React screen renders passed; no browser, external calls or screenshots.')
