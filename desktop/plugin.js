import { createElement as h, useEffect, useRef, useState } from 'react'
import { ROUTES_AREA, SIDEBAR_NAV_AREA, host, useValue, gatewayActivationEpoch } from '@hermes/plugin-sdk'

const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const sample = () => ({ name: 'Aurora Studio (fictional)', members: [
  { name: 'Mika', zone: 'Asia/Taipei', windows: [{ start: '20:00', end: '23:00', weekdays: [0,1,2,3,4] }] },
  { name: 'Rowan', zone: 'America/New_York', windows: [{ start: '08:00', end: '11:00', weekdays: [0,1,2,3,4] }] },
  { name: 'Ivo', zone: 'Europe/London', windows: [{ start: '12:00', end: '17:00', weekdays: [0,1,2,3,4] }] },
  { name: 'Nora', zone: 'America/Los_Angeles', windows: [{ start: '05:00', end: '09:00', weekdays: [0,1,2,3,4] }] }
] })

const css = `
.penguin-page{--p-ink:#11172c;--p-muted:#52607a;--p-line:#c6ccdc;--p-teal:#1845ff;color:var(--p-ink);background:#0b1230;font:14px/1.5 system-ui,sans-serif;height:100%;overflow:auto;container-type:inline-size;background-image:radial-gradient(#30406a .65px,transparent .65px);background-size:7px 7px}
.penguin-page *{box-sizing:border-box}.penguin-page button,.penguin-page input,.penguin-page select{font:inherit}.penguin-page button{cursor:pointer}.penguin-page button:disabled{opacity:.5;cursor:default}
.penguin-page button:focus-visible,.penguin-page input:focus-visible,.penguin-page select:focus-visible,.penguin-page summary:focus-visible{outline:3px solid #ffab35;outline-offset:3px}
.penguin-page .p-wrap{max-width:1180px;margin:auto;padding:24px 32px 32px}.penguin-page .p-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;color:#f8f2df}.penguin-page .p-logo{font-size:24px;font-weight:850;letter-spacing:-1px}.penguin-page .p-logo::before{content:'✳';color:#6582ff;margin-right:9px}.penguin-page .p-tag{font:10px ui-monospace,monospace;text-transform:uppercase;letter-spacing:1.7px;color:#c1cbed}
.penguin-page .p-hero{position:relative;display:flex;align-items:center;justify-content:space-between;gap:24px;padding:22px 30px;background:#1945ff;border:1px solid #6482ff;border-radius:4px;overflow:hidden;color:#fff7df;box-shadow:5px 5px 0 #03091d}.penguin-page .p-hero:after{content:'';position:absolute;bottom:9px;left:30px;width:130px;height:3px;background:repeating-linear-gradient(90deg,#fbf0d4 0 7px,transparent 7px 10px);transform:rotate(-1deg)}.penguin-page h1{font-size:clamp(28px,3.2cqw,39px);line-height:1.07;letter-spacing:-1.5px;margin:14px 0 13px;font-weight:800;max-width:600px}.penguin-page .p-lead{max-width:600px;margin:0;color:#e3e9ff;font-size:13px}.penguin-page .p-badge{display:inline-flex;border-radius:3px;padding:5px 9px;background:#fff5d9;color:#1a389b;font:700 10px ui-monospace,monospace;letter-spacing:.5px}.penguin-page .p-art{flex:0 0 190px;width:190px;height:190px;object-fit:cover;display:block;border:2px solid #fff0c9;box-shadow:5px 5px 0 #0a1028;transform:rotate(2deg);border-radius:2px}
.penguin-page .p-panel{background:#f4f1e8;border:1px solid #d5d7e0;border-radius:4px;padding:22px}.penguin-page h2{font-size:20px;letter-spacing:-.5px;margin:0}.penguin-page h3{font-size:14px;margin:0}.penguin-page .p-sub{color:var(--p-muted);font-size:12px;margin:5px 0 18px}.penguin-page .p-row{display:flex;align-items:center;gap:10px}.penguin-page .p-between{justify-content:space-between}.penguin-page .p-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0}.penguin-page label{display:block;font-size:11px;font-weight:650;color:var(--p-muted)}
.penguin-page input,.penguin-page select{display:block;width:100%;min-width:0;border:1px solid #aeb8ce;background:#fffdf6;border-radius:3px;color:var(--p-ink);padding:9px 10px;margin-top:5px}.penguin-page input[type=checkbox]{display:inline;width:14px;margin:0;accent-color:#1845ff}.penguin-page .p-avatar{display:grid;place-items:center;background:#e6eaff;border:1px solid #a3b2e8;border-radius:3px;width:28px;height:28px;font:700 12px ui-monospace,monospace;flex:0 0 28px;color:#193eaf}.penguin-page .p-days{display:flex;gap:5px;flex-wrap:wrap}.penguin-page .p-day{display:flex;align-items:center;gap:3px;font-size:10px;background:#e9eaf0;border-radius:3px;padding:4px}.penguin-page .p-link{background:none;border:0;color:#2148b9;padding:5px 0;font-size:12px;font-weight:650}.penguin-page .p-secondary{background:#fffdf7;border:1px solid #a2b0cf;color:#2148b9;border-radius:3px;padding:8px 11px;font-size:12px;font-weight:650}.penguin-page .p-primary{background:#1945ff;border:1px solid #1945ff;color:white;border-radius:3px;padding:12px 16px;font-weight:700;width:100%;margin:0;white-space:nowrap;box-shadow:2px 2px 0 #afbbdf}.penguin-page .p-primary:hover{background:#1035d4}.penguin-page .p-status{padding:12px 14px;background:#fff0c9;border:1px solid #e4b95b;border-radius:3px;font-size:13px;margin-top:16px;overflow-wrap:anywhere}.penguin-page .p-small{font-size:11px;color:var(--p-muted);overflow-wrap:anywhere}.penguin-page .p-time{font:700 38px ui-monospace,monospace;font-variant-numeric:tabular-nums;letter-spacing:-2px;white-space:nowrap}.penguin-page .p-foot{color:#bbc5e8;font-size:11px;margin-top:22px}.penguin-page .p-window{background:#e9ebf1;border-radius:3px;padding:9px;margin-top:8px}.penguin-page .p-window .p-fields{margin:0 0 8px}.penguin-page .p-manual{white-space:pre-wrap;overflow-wrap:anywhere;user-select:text;font-size:12px;background:#edf0ff;padding:14px;border-radius:3px}
.penguin-page .p-planner{margin-top:20px}.penguin-page .p-tools{display:grid;grid-template-columns:1fr 1.5fr 1fr 1fr;align-items:end;gap:16px}.penguin-page .p-timeline{margin-top:16px;overflow-x:auto;padding:3px}.penguin-page .p-rail{min-width:500px}.penguin-page input[type=range]{accent-color:#1845ff;border:0;background:none;padding:0;height:24px;margin:10px 0 0}.penguin-page .p-ticks{display:flex;justify-content:space-between;font:10px ui-monospace,monospace;color:var(--p-muted)}.penguin-page .p-selected{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:18px}.penguin-page .p-selected input{font:700 27px ui-monospace,monospace;max-width:130px;padding:6px 10px;margin:0;color:#1945e7;background:#e7ebff;border-color:#a7b6f3}.penguin-page .p-overview{margin:25px 0 12px;color:#fff6df}.penguin-page .p-overview .p-small{color:#c5cdeb}.penguin-page .p-clocks{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.penguin-page .p-clockcard{padding:18px;background:#f4f1e8;border:1px solid #b4c0dc;border-top:4px solid #8793b8;border-radius:3px;min-width:0}.penguin-page .p-clockcard.p-good{border-top-color:#4670ff}.penguin-page .p-clockcard.p-away{border-top-color:#ffb548}.penguin-page .p-clockcard .p-time{margin:12px 0 3px;line-height:1.2;color:#1239c6}.penguin-page .p-zone{font:10px ui-monospace,monospace;overflow-wrap:anywhere;min-height:30px;margin:8px 0 0;color:var(--p-muted)}.penguin-page .p-clockcard .p-badge{margin-top:12px;font-size:9px;background:#dce5ff;color:#143da9}.penguin-page .p-clockcard.p-away .p-badge{background:#ffe1a9;color:#68420d}.penguin-page .p-daybar{position:relative;height:15px;background:repeating-linear-gradient(90deg,#dee2ed 0%,#dee2ed 24%,#b6bfd4 24%,#b6bfd4 25%);border-radius:2px;margin:16px 0 6px;overflow:hidden}.penguin-page .p-work{position:absolute;height:100%;background:#5479ff}.penguin-page .p-marker{position:absolute;width:3px;top:0;bottom:0;background:#09132f;box-shadow:0 0 0 1px #fff5db}.penguin-page .p-summary{display:flex;justify-content:space-between;align-items:center;gap:18px;margin:16px 0;padding:17px 21px;background:#e3e9ff;border:1px solid #8ea5f2;border-left:4px solid #4065ff;border-radius:3px}.penguin-page .p-summary h2{font-size:18px}.penguin-page .p-summary .p-primary{width:auto}.penguin-page .p-options{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:14px}.penguin-page .p-option{padding:8px 12px;border:1px solid #98abe7;background:#f8f9ff;border-radius:3px;color:#1e40aa;font-weight:650}.penguin-page .p-option:hover{background:#e0e8ff}.penguin-page .p-settings{background:#f4f1e8;border:1px solid var(--p-line);border-radius:3px;padding:18px 22px;margin-top:22px}.penguin-page summary{cursor:pointer;font-weight:700}.penguin-page .p-editgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.penguin-page .p-member{border:1px solid var(--p-line);border-radius:3px;padding:14px;margin-top:10px}.penguin-page .p-teamhead{max-width:520px;margin:18px 0 10px}.penguin-page .p-save{display:flex;align-items:end;gap:12px;flex-wrap:wrap;border-top:1px solid var(--p-line);padding-top:15px;margin-top:15px}.penguin-page .p-save label{flex:1;min-width:140px}
@container(max-width:800px){.penguin-page .p-wrap{padding:20px}.penguin-page .p-tools{grid-template-columns:1fr 1fr}.penguin-page .p-clocks{grid-template-columns:repeat(2,minmax(0,1fr))}.penguin-page .p-clockcard .p-time{font-size:34px}.penguin-page .p-hero{padding:20px}.penguin-page .p-art{width:150px;height:150px;flex-basis:150px}.penguin-page h1{font-size:30px}.penguin-page .p-summary{flex-wrap:wrap}.penguin-page .p-editgrid{grid-template-columns:1fr}}
@container(max-width:480px){.penguin-page .p-wrap{padding:12px}.penguin-page .p-tag{max-width:160px;font-size:8px;text-align:right}.penguin-page .p-hero{padding:20px 16px 22px;gap:10px;align-items:start}.penguin-page h1{font-size:25px;letter-spacing:-1px}.penguin-page .p-hero .p-badge{font-size:8px;padding:4px}.penguin-page .p-lead{font-size:11px}.penguin-page .p-art{width:96px;height:130px;flex-basis:96px;object-fit:cover;object-position:25% 50%;margin-top:5px}.penguin-page .p-panel{padding:15px}.penguin-page .p-clockcard{padding:14px 12px}.penguin-page .p-clockcard .p-time{font-size:31px}.penguin-page .p-clocks{gap:8px}.penguin-page .p-tools{gap:10px}.penguin-page .p-tools input{font-size:12px;padding:8px}.penguin-page .p-tools .p-primary{padding:10px 7px;font-size:12px}.penguin-page .p-summary .p-primary{width:100%}.penguin-page .p-selected{align-items:start}.penguin-page .p-selected strong{font-size:12px}.penguin-page .p-selected input{max-width:105px;font-size:23px}.penguin-page .p-settings{padding:15px}.penguin-page .p-fields{grid-template-columns:1fr}.penguin-page .p-overview{align-items:start}.penguin-page .p-overview .p-small{max-width:125px;text-align:right}.penguin-page .p-summary{padding:15px}.penguin-page .p-clockcard .p-badge{font-size:8px;padding:5px}}
`

const introCss = `
.penguin-page .p-top{flex-wrap:wrap}.penguin-page .p-wordmark{width:188px;height:44px;display:block;flex:0 0 auto}.penguin-page .p-tag{margin-left:auto}
.p-intro{position:relative;min-height:100%;display:grid;place-items:center;isolation:isolate;overflow:hidden;background:linear-gradient(#09152e 0%,#204e79 46%,#b7e5f0 47%,#8dcada 65%,#d9f2f7 66%);padding:32px 22px}
.p-intro .p-mountains{position:absolute;inset:14% -10% 28%;background:#172a41;clip-path:polygon(0 82%,12% 20%,22% 60%,34% 5%,49% 85%,64% 32%,75% 66%,88% 8%,100% 82%,100% 100%,0 100%);z-index:-2}
.p-intro .p-mountains:after{content:'';position:absolute;inset:0;background:#e5f8ff;clip-path:polygon(9% 36%,12% 20%,18% 44%,14% 38%,12% 44%,30% 23%,34% 5%,42% 46%,35% 31%,33% 42%,85% 25%,88% 8%,94% 42%,88% 30%)}
.p-intro .p-ice{position:absolute;inset:62% 0 0;background:repeating-linear-gradient(174deg,transparent 0 27px,#edfaff 28px 33px,transparent 34px 72px);z-index:-1;transform:skewY(-2deg)}
.p-intro .p-station{position:absolute;right:7%;bottom:24%;width:76px;height:30px;background:#d55b38;border:4px solid #172a41;box-shadow:0 9px 0 -2px #273547;transform:skewY(-5deg);z-index:-1}
.p-intro .p-console{width:min(680px,100%);border:9px solid #172038;border-radius:14px;background:#09132ceF;padding:24px;text-align:center;color:#eef8ff;box-shadow:0 0 0 2px #6e8db6,0 16px 0 #172038,0 24px 30px #07101a70;animation:p-arrive 650ms ease-out}
.p-intro .p-console:before{content:'●  ●  ●   ANTARCTIC CONTROL / ONLINE';display:block;color:#69bcff;font:10px ui-monospace,monospace;letter-spacing:2px;margin-bottom:18px}
.p-intro .p-art{width:min(280px,65vw);height:min(280px,65vw);margin:0 auto 22px;border:2px solid #4387ff;box-shadow:0 0 28px #1e58ff60;transform:none}
.p-intro h1{font-size:clamp(24px,4cqw,38px);letter-spacing:.01em;margin:10px auto 8px;max-width:none;color:#f5f2dc}.p-intro p{margin:0 0 20px;color:#9ec8f6;font:12px ui-monospace,monospace}.p-intro button{background:#2051ff;color:#fff;border:1px solid #91acff;border-radius:3px;padding:10px 18px;font-weight:700}.p-replay{background:none;color:#c1cbed;border:1px solid #52638d;border-radius:3px;padding:5px 8px;font:10px ui-monospace,monospace!important}
@keyframes p-arrive{from{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.p-intro .p-console{animation:none}}
@container(max-width:480px){.p-intro{padding:20px 14px}.p-intro .p-console{padding:20px 12px;border-width:6px}.p-intro .p-console:before{font-size:8px;letter-spacing:1px}.p-intro h1{font-size:23px}.p-intro .p-art{width:200px;height:200px}.p-replay{max-width:90px}}
`

const experienceCss = `
.penguin-page{--p-mono:ui-monospace,monospace;--p-display:system-ui,sans-serif}
.penguin-page .p-selected input{font:700 32px var(--p-mono);font-variant-numeric:tabular-nums;letter-spacing:-2px}
.penguin-page .p-clockcard .p-time{font-family:var(--p-mono);font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-2px}
.penguin-page .p-clocks[aria-busy=true]{opacity:.68}.penguin-page .p-marker{transition:left 120ms linear}
.p-sendoff{position:relative;isolation:isolate;overflow:hidden;border:1px solid #6e99ff;border-radius:5px;background:#09152e;color:#edf7ff;padding:22px 24px;margin-top:18px;display:flex;gap:24px;align-items:center;animation:p-arrive 400ms ease-out}.p-sendoff .p-art{width:132px;height:132px;flex:0 0 132px;border:1px solid #6a9aff;transform:none;box-shadow:none}.p-sendoff .p-sendoff-copy{flex:1;min-width:0}.p-sendoff h2{font:700 13px var(--p-mono);letter-spacing:1px;color:#9dc6ff;margin:0 0 8px}.p-sendoff h3{font-size:clamp(20px,2.4cqw,28px);font-family:var(--p-display);line-height:1.2;margin:0 30px 10px 0;color:#fff7e5}.p-sendoff p{font-size:13px;color:#c7dafa;margin:7px 0}.p-sendoff button{position:absolute;top:12px;right:12px;background:#132a55;border:1px solid #7899d8;color:white;border-radius:3px;padding:5px 9px;font-size:13px}.p-sendoff .p-final-times{display:flex;gap:7px 18px;flex-wrap:wrap;font:12px var(--p-mono);color:#d4e8ff}.p-sendoff .p-aurora{position:absolute;inset:-50% -10%;z-index:-1;opacity:.38;background:radial-gradient(circle,#e9faff 1px,transparent 1.7px);background-size:7px 7px;mask-image:linear-gradient(165deg,transparent 37%,black 43%,transparent 49%,black 54%,transparent 62%);background-color:#1252df;transform:translateX(-4%) skewY(-8deg);animation:p-aurora 6s ease-in-out 1 alternate}

@keyframes p-aurora{0%{transform:translateX(-10%) skewY(-13deg);opacity:.1}45%{opacity:.45}100%{transform:translateX(5%) skewY(5deg);opacity:.38}}
@media(prefers-reduced-motion:reduce){.p-sendoff,.p-sendoff .p-aurora,.penguin-page .p-marker{animation:none;transition:none}}
@container(max-width:800px){.p-sendoff{gap:16px;padding:20px}.p-sendoff .p-art{width:100px;height:100px;flex-basis:100px}}
@container(max-width:480px){.penguin-page .p-selected input{font-size:28px;max-width:112px}.p-sendoff{display:block;padding:18px}.p-sendoff .p-art{width:86px;height:86px;margin-bottom:14px}.p-sendoff h3{font-size:23px}.p-sendoff .p-final-times{display:grid;grid-template-columns:1fr 1fr;font-size:11px}}
`

function SendOff({ctx,slot,onClose}) {
  return h('section',{className:'p-sendoff','aria-label':'Meeting proposal completed'},
    h('div',{className:'p-aurora','aria-hidden':true}),h(PenguinArt,{ctx}),
    h('div',{className:'p-sendoff-copy'},h('h2',{},'PROPOSAL COPIED · TRANSMISSION COMPLETE'),
      h('h3',{},'Dismissed. See you next time in the Antarctic control room.'),
      h('div',{className:'p-final-times'},...slot.members.map((m,i)=>h('span',{key:i},`${m.name} ${m.start.local.slice(11,16)} · ${m.start.date}`))),
      h('p',{},'Share the proposal and confirm availability. No calendar event has been created.')),
    h('button',{onClick:onClose,'aria-label':'Close send-off'},'×'))
}

function ControlRoom({ctx,onContinue}) {
  useEffect(()=>{const timer=setTimeout(onContinue,3600);return()=>clearTimeout(timer)},[])
  return h('section',{className:'p-intro','aria-label':'Antarctic control room'},
    h('div',{className:'p-mountains','aria-hidden':true}),h('div',{className:'p-ice','aria-hidden':true}),h('div',{className:'p-station','aria-hidden':true}),
    h('div',{className:'p-console'},h(PenguinArt,{ctx}),h('h1',{},'Your time is under my command.'),
      h('p',{},'COMMANDER PENGUIN · YOUR SHARED MOMENT AWAITS'),h('button',{onClick:onContinue},'Enter planner · 略過開場')))
}

function Wordmark() {
  const glyphs = {
    P:['11110','10001','10001','11110','10000','10000','10000'],
    E:['11111','10000','10000','11110','10000','10000','11111'],
    N:['10001','11001','11001','10101','10011','10011','10001'],
    G:['01111','10000','10000','10111','10001','10001','01110'],
    U:['10001','10001','10001','10001','10001','10001','01110'],
    I:['11111','00100','00100','00100','00100','00100','11111']
  }
  return h('svg',{className:'p-wordmark',viewBox:'0 0 176 41',role:'img','aria-label':'PENGUIN'},
    h('title',{},'PENGUIN'),h('path',{d:'M2 11 L11 2 H166 L174 10 V30 L166 39 H11 L2 31 Z',fill:'#091226',stroke:'#315dff',strokeWidth:2}),
    ...[...'PENGUIN'].flatMap((letter,i)=>glyphs[letter].flatMap((row,y)=>[...row].map((dot,x)=>dot==='1'?h('rect',{key:`${i}-${y}-${x}`,x:12+i*22+x*3,y:10+y*3,width:2.3,height:2.3,rx:.35,fill:'#fff2d2'}):null))))
}

function PenguinArt({ctx}) {
  const [src,setSrc]=useState('')
  useEffect(()=>{
    let active=true
    ctx.rest('/art',{method:'GET'}).then(r=>{if(active&&r.src)setSrc(r.src)}).catch(()=>{})
    return()=>{active=false}
  },[ctx])
  if(src)return h('img',{src,className:'p-art',alt:'Penguin in a flight jacket and electric-blue goggles at an Antarctic world-clock station'})
  return h('svg', { viewBox:'0 0 240 230', className:'p-art', role:'img', 'aria-label':'Penguin in Antarctica looking after the world’s clocks' },
    h('ellipse',{cx:121,cy:206,rx:103,ry:17,fill:'#c1ded8'}),
    h('path',{d:'M18 202 L62 178 L146 174 L224 202 L173 221 L64 222 Z',fill:'#f7fdfb'}),
    h('circle',{cx:187,cy:51,r:28,fill:'#effaf3',stroke:'#9fc5bc',strokeWidth:2}),
    h('path',{d:'M187 34 V51 L199 57',fill:'none',stroke:'#437b73',strokeWidth:3,strokeLinecap:'round'}),
    h('path',{d:'M66 169 Q40 142 64 105 L82 110 Z',fill:'#24414d'}),
    h('path',{d:'M159 117 Q190 104 189 86 Q204 117 165 154 Z',fill:'#24414d'}),
    h('ellipse',{cx:111,cy:124,rx:56,ry:77,fill:'#24414d'}),
    h('ellipse',{cx:110,cy:140,rx:41,ry:55,fill:'#fcfaf1'}),
    h('ellipse',{cx:88,cy:97,rx:21,ry:26,fill:'#fcfaf1'}),
    h('ellipse',{cx:127,cy:97,rx:21,ry:26,fill:'#fcfaf1'}),
    h('circle',{cx:92,cy:93,r:4,fill:'#193743'}),h('circle',{cx:125,cy:93,r:4,fill:'#193743'}),
    h('path',{d:'M99 106 L118 106 L109 117 Z',fill:'#e6aa48'}),
    h('path',{d:'M69 126 Q110 144 152 124 L154 138 Q109 157 69 139 Z',fill:'#39a398'}),
    h('path',{d:'M137 136 L153 140 L160 169 L144 166 Z',fill:'#39a398'}),
    h('ellipse',{cx:86,cy:199,rx:18,ry:7,fill:'#e6aa48'}),h('ellipse',{cx:136,cy:199,rx:18,ry:7,fill:'#e6aa48'}),
    h('path',{d:'M33 56 V68 M27 62 H39 M214 139 V149 M209 144 H219',stroke:'#7eafa5',strokeWidth:2,strokeLinecap:'round'}))
}

function Field({label, value, onChange, ...props}) {
  return h('label', {}, label, h('input', {...props, value, onChange:e=>onChange(e.target.value)}))
}

function proposal(slot) {
  return ['Meeting proposal · Penguin', `${slot.elapsed_minutes} minutes · ${slot.start_utc} → ${slot.end_utc}`,
    ...slot.members.map(m=>`${m.name}: ${m.start.local} → ${m.end.local} (${m.start.zone})`),
    'Please confirm availability. No calendar event has been created.'].join('\n')
}


function clockMinutes(value) {const [hours,minutes]=value.split(':').map(Number);return hours*60+minutes}
function clockText(value) {return `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`}
function daySegments(member,weekday) {
  const day=dayNames.indexOf(weekday), spans=[]
  for(const w of member.windows){
    const a=clockMinutes(w.start),b=clockMinutes(w.end)
    if(a<b&&w.weekdays.includes(day))spans.push([a,b])
    if(a>b){if(w.weekdays.includes(day))spans.push([a,1440]);if(w.weekdays.includes((day+6)%7))spans.push([0,b])}
  }
  return spans
}

function ClockCard({member,view,index}) {
  return h('article',{className:`p-clockcard ${view?(view.available?'p-good':'p-away'):''}`},
    h('div',{className:'p-row'},h('span',{className:'p-avatar'},String(index+1)),h('h3',{},member.name)),
    h('div',{className:'p-zone'},member.zone),
    h('div',{className:'p-time'},view?view.start.local.slice(11,16):'—:—'),
    h('div',{className:'p-small'},view?`${view.start.date} · ${view.start.weekday}`:'Waiting for a valid time'),
    h('div',{className:'p-small',style:{marginTop:5}},view?`Until ${view.end.local.slice(11,16)}${view.end.date!==view.start.date?' · '+view.end.date:''}`:' '),
    h('div',{className:'p-small'},view?`UTC${view.start.local.slice(16)}${view.start.is_dst?' · DST':''}`:' '),
    view&&h('div',{},h('div',{className:'p-daybar','aria-hidden':true},
      ...daySegments(member,view.start.weekday).map(([a,b],i)=>h('span',{className:'p-work',key:i,style:{left:`${a/14.4}%`,width:`${(b-a)/14.4}%`}})),
      h('span',{className:'p-marker',style:{left:`${clockMinutes(view.start.local.slice(11,16))/14.4}%`}})),
      h('div',{className:'p-ticks'},...['00','06','12','18','24'].map(x=>h('span',{key:x},x)))),
    h('span',{className:'p-badge'},view?(view.available?'✓ FULL MEETING FITS':'OUTSIDE WORK HOURS'):'CHECKING…'),
    view&&view.start.offset_minutes!==view.end.offset_minutes&&h('p',{className:'p-small'},`Clock changes during meeting → UTC${view.end.local.slice(16)}`))
}

function Planner({ctx,profile}) {
  const [intro,setIntro]=useState(true)
  const [team,setTeam]=useState(sample), [teamId,setTeamId]=useState('aurora-demo')
  const [date,setDate]=useState('2026-11-16'), [reference,setReference]=useState('Asia/Taipei'), [duration,setDuration]=useState('60')
  const [time,setTime]=useState('21:00'), [ambiguity,setAmbiguity]=useState('reject')
  const [view,setView]=useState(null), [previewError,setPreviewError]=useState(null), [previewPending,setPreviewPending]=useState(true)
  const [completed,setCompleted]=useState(null)
  const [result,setResult]=useState(null), [notice,setNotice]=useState(''), [busy,setBusy]=useState(false), [manual,setManual]=useState('')
  const generation=useRef(0), previewGeneration=useRef(0), epoch=useRef(gatewayActivationEpoch())
  function resetScope(){
    generation.current++;previewGeneration.current++;epoch.current=gatewayActivationEpoch()
    setTeam(sample());setTeamId('aurora-demo');setResult(null);setView(null);setManual('');setBusy(false);setCompleted(null);setPreviewPending(true)
    setNotice('Connection changed. Fictional sample restored. Load a team from this profile to continue.')
  }
  useEffect(()=>{
    const timer=setInterval(()=>{if(epoch.current!==gatewayActivationEpoch())resetScope()},1000)
    return()=>{clearInterval(timer);generation.current++;previewGeneration.current++}
  },[])
  useEffect(()=>{
    const seq=++previewGeneration.current,captured=epoch.current
    setPreviewPending(true);setPreviewError(null)
    ;(async()=>{
      try{
        const answer=await ctx.rest('/preview',{method:'POST',body:{team,reference_zone:reference,local_time:`${date}T${time}`,duration_minutes:Number(duration),ambiguity}})
        if(seq!==previewGeneration.current||captured!==gatewayActivationEpoch())return
        if(answer.ok)setView(answer.result);else {setView(null);setPreviewError(answer.error)}
      }catch{if(seq===previewGeneration.current){setView(null);setPreviewError({message:'Enable Penguin’s agent plugin and restart the gateway to connect this planner.'})}}
      finally{if(seq===previewGeneration.current&&captured===gatewayActivationEpoch())setPreviewPending(false)}
    })()
    return()=>{previewGeneration.current++}
  },[team,date,reference,duration,time,ambiguity])
  function edit(setter,value){
    generation.current++;previewGeneration.current++;setter(value);setView(null);setResult(null);setManual('');setNotice('');setBusy(false);setCompleted(null);setPreviewPending(true)
    setAmbiguity('reject')
  }
  function selectTime(value){if(value===time&&ambiguity==='reject')return;previewGeneration.current++;setTime(value);setAmbiguity('reject');setManual('');setNotice('');setCompleted(null);setPreviewPending(true)}
  function updateMember(index,change){edit(setTeam,{...team,members:team.members.map((m,i)=>i===index?{...m,...change}:m)})}
  function updateWindow(mi,wi,change){updateMember(mi,{windows:team.members[mi].windows.map((w,i)=>i===wi?{...w,...change}:w)})}
  async function request(path,body,onSuccess){
    if(epoch.current!==gatewayActivationEpoch()){resetScope();return}
    const seq=++generation.current,captured=epoch.current
    setBusy(true);setNotice('');setManual('');setCompleted(null)
    try{
      const answer=await ctx.rest(path,{method:'POST',body})
      if(seq!==generation.current||captured!==gatewayActivationEpoch())return
      if(!answer.ok){setNotice(answer.error.message);return}
      onSuccess(answer.result)
    }catch{if(seq===generation.current&&captured===gatewayActivationEpoch())setNotice('Penguin could not reach its backend. Enable the agent plugin and restart the gateway, then try again.')}
    finally{if(seq===generation.current)setBusy(false)}
  }
  async function copy(){
    if(!view||previewPending)return
    if(epoch.current!==gatewayActivationEpoch()){resetScope();return}
    const copiedView=view,seq=previewGeneration.current,captured=epoch.current
    const text=proposal(copiedView)+(copiedView.all_available?'':'\nNote: this time is outside at least one member’s work hours.')
    try{
      const ok=await ctx.os.writeClipboard(text);if(!ok)throw Error('clipboard')
      if(seq!==previewGeneration.current||captured!==gatewayActivationEpoch())return
      setNotice('Meeting proposal copied. No calendar event created.');setCompleted(copiedView)
    }catch{if(seq===previewGeneration.current&&captured===gatewayActivationEpoch()){setManual(text);setNotice('Select and copy the proposal below. No calendar event created.')}}
  }
  function chooseSlot(slot){
    const choice=slot.reference_start.fold?'later':'earlier'
    if(date===slot.reference_start.date&&time===slot.reference_start.local.slice(11,16)&&ambiguity===choice)return
    previewGeneration.current++;setPreviewPending(true);setCompleted(null);setDate(slot.reference_start.date);setTime(slot.reference_start.local.slice(11,16))
    setAmbiguity(choice);setManual('');setNotice('')
  }
  return h('main',{className:'penguin-page'},h('style',{},css+introCss+experienceCss),intro?h(ControlRoom,{ctx,onContinue:()=>setIntro(false)}):h('div',{className:'p-wrap'},
    h('header',{className:'p-top'},h(Wordmark),h('button',{className:'p-replay',onClick:()=>setIntro(true)},'Replay arrival'),h('span',{className:'p-tag'},`ANTARCTIC TIMEKEEPER · ${profile}`)),
    h('section',{className:'p-hero'},h('div',{},h('span',{className:'p-badge'},'MANY PLACES. ONE MOMENT.'),
      h('h1',{},'The world runs on different hours.'),h('p',{className:'p-lead'},'One cool penguin. A whole world of teammates. Find your shared moment from the Antarctic control room.')),h(PenguinArt,{ctx})),
    h('section',{className:'p-panel p-planner','aria-label':'Meeting planner'},
      h('div',{className:'p-tools'},
        h(Field,{label:'Reference date',type:'date',min:'2000-01-01',max:'2100-12-31',value:date,onChange:v=>edit(setDate,v)}),
        h(Field,{label:'Reference time zone',value:reference,onChange:v=>edit(setReference,v)}),
        h('label',{},'Meeting length',h('select',{value:duration,onChange:e=>edit(setDuration,e.target.value)},...[15,30,45,60,90,120,180].map(n=>h('option',{value:String(n),key:n},`${n} minutes`)))),
        h('button',{className:'p-primary',disabled:busy,onClick:()=>request('/overlap',{team,reference_zone:reference,start_date:date,duration_minutes:Number(duration),max_slots:20},setResult)},busy?'Checking…':'Find shared time')),
      h('div',{className:'p-selected'},h('div',{},h('strong',{},'One slider. Everyone’s local time.'),h('div',{className:'p-small'},`${reference} · ${duration}-minute meeting · 24-hour clock`)),h('input',{type:'text',inputMode:'numeric',maxLength:5,placeholder:'HH:MM','aria-label':'Selected reference time',value:time,onChange:e=>selectTime(e.target.value)})),
      h('div',{className:'p-timeline'},h('div',{className:'p-rail'},
        h('input',{type:'range',min:0,max:1425,step:15,value:Number.isFinite(clockMinutes(time))?clockMinutes(time):0,'aria-label':'Reference time slider',onChange:e=>selectTime(clockText(Number(e.target.value)))}),
        h('div',{className:'p-ticks'},...['00:00','06:00','12:00','18:00','23:45'].map(t=>h('span',{key:t},t))))),
      result&&h('div',{className:'p-options'},h('span',{className:'p-small'},result.total_slots?`${result.total_slots} shared options${result.slots_truncated?' (first 20 shown)':''}:`:'No shared time fits this meeting. Try another date or change work hours.'),
        ...result.slots.map(slot=>h('button',{className:'p-option',key:slot.start_utc,onClick:()=>chooseSlot(slot)},slot.reference_start.local.slice(11,16)))),
      previewError&&h('div',{className:'p-status',role:'status'},previewError.message,
        previewError.code==='ambiguous_local_time'&&h('div',{className:'p-options'},...['earlier','later'].map(choice=>h('button',{className:'p-secondary',key:choice,onClick:()=>setAmbiguity(choice)},`Use ${choice} occurrence`))))),
    h('div',{className:'p-row p-between p-overview'},h('h2',{},`Your ${team.members.length===4?'four':team.members.length} places`),h('span',{className:'p-small'},team.name)),
    h('section',{className:'p-clocks','aria-label':'Side-by-side team clocks','aria-busy':previewPending},...team.members.map((member,i)=>h(ClockCard,{key:i,index:i,member,view:view?.members[i]}))),
    h('section',{className:'p-summary','aria-live':'polite'},
      h('div',{},h('h2',{},previewPending?'Updating everyone’s clocks…':view?`${view.members.filter(m=>m.available).length} of ${team.members.length} can fit the full meeting`:'Choose a valid time to compare'),
        h('div',{className:'p-small'},view?`${view.start_utc} → ${view.end_utc} · IANA ${view.database.iana_version}`:'Penguin checks the whole meeting, including daylight-saving transitions.')),
      h('button',{className:'p-primary',disabled:!view||previewPending,onClick:copy},'Copy meeting proposal ↗')),
    notice&&!completed&&h('div',{className:'p-status',role:'status'},notice),manual&&h('pre',{className:'p-manual',tabIndex:0,'aria-label':'Meeting proposal to copy'},manual),
    completed&&h(SendOff,{ctx,slot:completed,onClose:()=>setCompleted(null)}),
    h('details',{className:'p-settings'},h('summary',{},'Edit your colony · people, work hours & saved teams'),
      h('p',{className:'p-sub'},'Confirm every person’s IANA zone. Work bars show local wall-clock hours; folds repeat and gaps are skipped in the precise calculation.'),
      h('div',{className:'p-teamhead'},h(Field,{label:'Team name',value:team.name,onChange:v=>edit(setTeam,{...team,name:v}),maxLength:80})),
      h('div',{className:'p-editgrid'},...team.members.map((m,i)=>h('article',{className:'p-member',key:i},
        h('div',{className:'p-row p-between'},h('h3',{},m.name||'Team member'),h('button',{className:'p-link',disabled:team.members.length===1,onClick:()=>edit(setTeam,{...team,members:team.members.filter((_,n)=>n!==i)})},'Remove')),
        h('div',{className:'p-fields'},h(Field,{label:`Person ${i+1}`,value:m.name,onChange:v=>updateMember(i,{name:v}),maxLength:80}),h(Field,{label:`Time zone ${i+1}`,value:m.zone,onChange:v=>updateMember(i,{zone:v}),placeholder:'Area/City'})),
        ...m.windows.map((w,j)=>h('div',{className:'p-window',key:j},
          h('div',{className:'p-fields'},h(Field,{label:'From',type:'time',value:w.start,onChange:v=>updateWindow(i,j,{start:v})}),h(Field,{label:'Until',type:'time',value:w.end,onChange:v=>updateWindow(i,j,{end:v})})),
          h('div',{className:'p-row p-between'},h('div',{className:'p-days'},...weekdays.map((d,k)=>h('label',{className:'p-day',key:k,title:dayNames[k]},h('input',{type:'checkbox','aria-label':`${m.name} window ${j+1} ${dayNames[k]}`,checked:w.weekdays.includes(k),onChange:e=>updateWindow(i,j,{weekdays:e.target.checked?[...w.weekdays,k].sort():w.weekdays.filter(x=>x!==k)})}),d))),
            h('button',{className:'p-link','aria-label':`Remove ${m.name} window ${j+1}`,onClick:()=>updateMember(i,{windows:m.windows.filter((_,n)=>n!==j)})},'×')))),
        h('button',{className:'p-link',disabled:m.windows.length>=8,onClick:()=>updateMember(i,{windows:[...m.windows,{start:'09:00',end:'17:00',weekdays:[0,1,2,3,4]}]})},'+ Work window')))),
      h('button',{className:'p-secondary',style:{marginTop:14},disabled:team.members.length>=30,onClick:()=>edit(setTeam,{...team,members:[...team.members,{name:`Member ${team.members.length+1}`,zone:'UTC',windows:[{start:'09:00',end:'17:00',weekdays:[0,1,2,3,4]}]}]})},'+ Add a person'),
      h('p',{className:'p-small'},'Overnight windows belong to their starting weekday. Equal start and end means unavailable.'),
      h('div',{className:'p-save'},h(Field,{label:'Saved team ID',value:teamId,onChange:setTeamId,maxLength:40}),
        h('button',{className:'p-secondary',disabled:busy,onClick:()=>request('/teams/save',{team_id:teamId,team},()=>setNotice(`Saved “${teamId}” in profile ${profile}.`))},'Save / replace team'),
        h('button',{className:'p-secondary',disabled:busy,onClick:()=>request('/teams/get',{team_id:teamId},r=>{setTeam(r.team);setResult(null);setNotice(`Loaded “${teamId}”.`)})},'Load team')),
      h('p',{className:'p-small'},'Saving replaces this ID’s settings in the current profile.')),
    h('footer',{className:'p-foot'},'Penguin checks work-hour preferences. Confirm calendar conflicts and holidays separately. No invitations are sent.')))
}

function PenguinPage({ctx}) {
  const profile=useValue(host.state.profile)
  return h(Planner,{ctx,profile,key:profile})
}

export default {
  id:'penguin', name:'Penguin', defaultEnabled:false,
  register(ctx) {
    ctx.registerMany([
      {id:'page',area:ROUTES_AREA,data:{path:'/penguin'},render:()=>h(PenguinPage,{ctx})},
      {id:'nav',area:SIDEBAR_NAV_AREA,data:{path:'/penguin',label:'Penguin',codicon:'globe'}}
    ])
  }
}
