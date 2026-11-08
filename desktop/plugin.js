import { createElement as h, Fragment, useEffect, useRef, useState } from 'react'
import { ROUTES_AREA, SIDEBAR_NAV_AREA, host, useValue, gatewayActivationEpoch, createBudgetedLoop } from '@hermes/plugin-sdk'
import {OfflineHandoff,handoffCss} from './handoff.js'

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
.penguin-page .p-planner{margin-top:20px}.penguin-page .p-tools{display:grid;grid-template-columns:1fr 1.5fr 1fr 1fr;align-items:end;gap:16px}.penguin-page .p-timeline{margin-top:16px;overflow-x:auto;padding:3px}.penguin-page .p-rail{min-width:500px}.penguin-page input[type=range]{accent-color:#1845ff;border:0;background:none;padding:0;height:24px;margin:10px 0 0}.penguin-page .p-ticks{display:flex;justify-content:space-between;font:10px ui-monospace,monospace;color:var(--p-muted)}.penguin-page .p-selected{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:18px}.penguin-page .p-selected input{font:700 27px ui-monospace,monospace;max-width:130px;padding:6px 10px;margin:0;color:#1945e7;background:#e7ebff;border-color:#a7b6f3}.penguin-page .p-overview{margin:25px 0 12px;color:#fff6df}.penguin-page .p-overview .p-small{color:#c5cdeb}.penguin-page .p-clocks{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.penguin-page .p-clockcard{padding:18px;background:#f4f1e8;border:1px solid #b4c0dc;border-top:4px solid #8793b8;border-radius:3px;min-width:0}.penguin-page .p-clockcard.p-good{border-top-color:#4670ff}.penguin-page .p-clockcard.p-away{border-top-color:#ffb548}.penguin-page .p-clockcard .p-time{margin:12px 0 3px;line-height:1.2;color:#1239c6}.penguin-page .p-zone{font:10px ui-monospace,monospace;overflow-wrap:break-word;min-height:30px;margin:8px 0 0;color:var(--p-muted)}.penguin-page .p-clockcard .p-badge{margin-top:12px;font-size:9px;background:#dce5ff;color:#143da9}.penguin-page .p-clockcard.p-away .p-badge{background:#ffe1a9;color:#68420d}.penguin-page .p-daybar{position:relative;height:15px;background:repeating-linear-gradient(90deg,#dee2ed 0%,#dee2ed 24%,#b6bfd4 24%,#b6bfd4 25%);border-radius:2px;margin:16px 0 6px;overflow:hidden}.penguin-page .p-work{position:absolute;height:100%;background:#5479ff}.penguin-page .p-marker{position:absolute;width:3px;top:0;bottom:0;background:#09132f;box-shadow:0 0 0 1px #fff5db}.penguin-page .p-summary{display:flex;justify-content:space-between;align-items:center;gap:18px;margin:16px 0;padding:17px 21px;background:#e3e9ff;border:1px solid #8ea5f2;border-left:4px solid #4065ff;border-radius:3px}.penguin-page .p-summary h2{font-size:18px}.penguin-page .p-summary .p-primary{width:auto}.penguin-page .p-options{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:14px}.penguin-page .p-option{padding:8px 12px;border:1px solid #98abe7;background:#f8f9ff;border-radius:3px;color:#1e40aa;font-weight:650}.penguin-page .p-option:hover{background:#e0e8ff}.penguin-page .p-settings{background:#f4f1e8;border:1px solid var(--p-line);border-radius:3px;padding:18px 22px;margin-top:22px}.penguin-page summary{cursor:pointer;font-weight:700}.penguin-page .p-editgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.penguin-page .p-member{border:1px solid var(--p-line);border-radius:3px;padding:14px;margin-top:10px}.penguin-page .p-teamhead{max-width:520px;margin:18px 0 10px}.penguin-page .p-save{display:flex;align-items:end;gap:12px;flex-wrap:wrap;border-top:1px solid var(--p-line);padding-top:15px;margin-top:15px}.penguin-page .p-save label{flex:1;min-width:140px}
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
.p-intro .p-console:before{content:'●  ●  ●   ANTARCTIC CONTROL / ONLINE';display:block;color:#69bcff;font:10px ui-monospace,monospace;letter-spacing:1.7px;margin-bottom:18px}
.p-intro .p-art{width:min(280px,65vw);height:min(280px,65vw);margin:0 auto 22px;border:2px solid #4387ff;box-shadow:0 0 28px #1e58ff60;transform:none}
.p-intro h1{font-size:clamp(24px,4cqw,38px);letter-spacing:.01em;margin:10px auto 8px;max-width:none;color:#f5f2dc}.p-intro p{margin:0 0 20px;color:#9ec8f6;font:11px ui-monospace,monospace;letter-spacing:1.7px}.p-intro button{background:#2051ff;color:#fff;border:1px solid #91acff;border-radius:3px;padding:10px 18px;font-weight:700}.p-replay{background:none;color:#c1cbed;border:1px solid #52638d;border-radius:3px;padding:5px 8px;font:10px ui-monospace,monospace!important}
@keyframes p-arrive{from{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){.p-intro .p-console{animation:none}}
@container(max-width:480px){.p-intro{padding:20px 14px}.p-intro .p-console{padding:20px 12px;border-width:6px}.p-intro .p-console:before{font-size:8px;letter-spacing:1px}.p-intro h1{font-size:23px}.p-intro .p-art{width:200px;height:200px}.p-replay{max-width:90px}}
`

const experienceCss = `
.penguin-page{--p-mono:ui-monospace,monospace;--p-display:system-ui,sans-serif;--p-sans:system-ui,sans-serif}
/* Type roles (brand guidelines): status line · badge · technical button · IANA zone · numerals. New elements reuse these instead of inventing styles. */
.penguin-page .p-tag,.p-intro .p-console:before,.p-intro p,.penguin-page .p-dispatch b{font-family:var(--p-mono);font-weight:400;text-transform:uppercase;letter-spacing:1.7px}
.p-replay,.penguin-page .p-salute,.p-sendoff .p-encore{font:10px var(--p-mono)!important;letter-spacing:0;text-transform:none}
.penguin-page .p-badge,.p-sendoff .p-stamp-art span{font-family:var(--p-mono);font-weight:700;letter-spacing:.5px}
.penguin-page .p-selected input{font:700 32px var(--p-mono);font-variant-numeric:tabular-nums;letter-spacing:-2px}
.penguin-page .p-clockcard .p-time{font-family:var(--p-mono);font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:-2px}
.penguin-page .p-clocks[aria-busy=true]{opacity:.68}.penguin-page .p-marker{transition:left 120ms linear}
.p-sendoff{position:relative;isolation:isolate;overflow:hidden;border:1px solid #6e99ff;border-radius:5px;background:#09152e;color:#edf7ff;padding:22px 24px;margin-top:18px;display:flex;gap:24px;align-items:center;animation:p-arrive 400ms ease-out}.p-sendoff .p-art{width:132px;height:132px;flex:0 0 132px;border:1px solid #6a9aff;transform:none;box-shadow:none}.p-sendoff .p-sendoff-copy{flex:1;min-width:0}.p-sendoff h2{font:700 13px var(--p-mono);letter-spacing:1px;color:#9dc6ff;margin:0 0 8px}.p-sendoff h3{font-size:clamp(20px,2.4cqw,28px);font-family:var(--p-display);line-height:1.2;margin:0 30px 10px 0;color:#fff7e5}.p-sendoff p{font-size:13px;color:#c7dafa;margin:7px 0}.p-sendoff .p-close{position:absolute;top:12px;right:12px;background:#132a55;border:1px solid #7899d8;color:white;border-radius:3px;padding:5px 9px;font-size:13px}.p-sendoff .p-final-date{display:block;white-space:nowrap}.p-sendoff .p-final-times>span{min-width:0}.p-sendoff .p-final-times{display:flex;gap:7px 18px;flex-wrap:wrap;font:12px var(--p-mono);color:#d4e8ff}.p-sendoff .p-aurora{position:absolute;inset:-50% -10%;z-index:-1;opacity:.38;background:radial-gradient(circle,#e9faff 1px,transparent 1.7px);background-size:7px 7px;mask-image:linear-gradient(165deg,transparent 37%,black 43%,transparent 49%,black 54%,transparent 62%);background-color:#1252df;transform:translateX(-4%) skewY(-8deg);animation:p-aurora 6s ease-in-out 1 alternate}

@keyframes p-stamp{0%{opacity:0;transform:rotate(-9deg) scale(1.9)}60%{opacity:1;transform:rotate(-9deg) scale(.94)}100%{opacity:1;transform:rotate(-9deg) scale(1)}}
.penguin-page .p-dispatch{display:flex;gap:10px;align-items:baseline;margin:10px 0 0;padding:10px 14px;background:#09152e;border:1px solid #315dff;border-radius:3px;color:#f5f2dc;font-size:13px;line-height:1.45}
.penguin-page .p-dispatch b{flex:0 0 auto;font:10px ui-monospace,monospace;text-transform:uppercase;letter-spacing:1.7px;color:#69bcff}
.penguin-page .p-salute{margin:10px 0 0 6px;background:none;border:1px solid #a3b2e8;border-radius:3px;color:#1a389b;padding:4px 7px}
.penguin-page .p-salute:hover{background:#e6eaff}
.penguin-page .p-commend{margin:8px 0 0;font-size:11px;line-height:1.4;color:#11172c;border-left:3px solid #1845ff;padding-left:8px}
.p-sendoff .p-stamp{position:absolute;right:58px;top:14px;border:3px double #fff2d2;color:#fff2d2;padding:5px 10px;font:700 11px ui-monospace,monospace;letter-spacing:1.5px;transform:rotate(-9deg);animation:p-stamp 520ms cubic-bezier(.2,1.4,.4,1) 250ms both;pointer-events:none}
@keyframes p-aurora{0%{transform:translateX(-10%) skewY(-13deg);opacity:.1}45%{opacity:.45}100%{transform:translateX(5%) skewY(5deg);opacity:.38}}
@media(prefers-reduced-motion:reduce){.p-sendoff,.p-sendoff .p-aurora,.p-sendoff .p-stamp,.penguin-page .p-marker{animation:none;transition:none}}
@container(max-width:800px){.p-sendoff{gap:16px;padding:20px}.p-sendoff .p-art{width:100px;height:100px;flex-basis:100px}}
@container(max-width:480px){.p-sendoff .p-stamp{position:static;display:inline-block;margin:0 0 10px}.penguin-page .p-dispatch{display:block}.penguin-page .p-dispatch b{display:block;margin-bottom:3px}.penguin-page .p-selected input{font-size:28px;max-width:112px}.p-sendoff{display:block;padding:18px}.p-sendoff .p-art{width:86px;height:86px;margin-bottom:14px}.p-sendoff h3{font-size:23px}.p-sendoff .p-final-times{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));font-size:11px}}
`

const kitCss = `
.p-intro .p-bg{position:absolute;inset:0;z-index:-3;background:#0b1230 center/cover no-repeat;animation:p-pan 9s ease-out both}
.p-intro.p-intro-art{background:#0b1230}.p-intro-art .p-mountains,.p-intro-art .p-ice,.p-intro-art .p-station{display:none}
.p-intro-art:before{content:'';position:absolute;inset:0;z-index:-2;background:radial-gradient(ellipse at 50% 55%,#09152e00 35%,#09152ebf 100%)}
.p-intro-art .p-console{background:#09132cd6;backdrop-filter:blur(2px)}
@keyframes p-pan{from{transform:scale(1.08)}to{transform:scale(1)}}
.penguin-page .p-dispatch-art{position:relative;display:block;padding:0;background:none;border:0;margin:16px auto 0;max-width:980px}
.p-dispatch-art .p-dispatch-frame{display:block;width:100%;height:auto;filter:drop-shadow(4px 4px 0 #03091d)}
.p-dispatch-art .p-dispatch-copy{position:absolute;left:46%;top:20%;width:46%;height:34%;display:flex;flex-direction:column;justify-content:center;gap:4px;color:#11172c}
.p-dispatch-art .p-dispatch-copy b{color:#1845ff}
.p-dispatch-art .p-dispatch-line{font-size:clamp(12px,1.4cqw,16px);line-height:1.3;font-weight:650}
.penguin-page .p-dispatch-line{display:block;animation:p-transmit 420ms steps(18,end)}
@keyframes p-transmit{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
.penguin-page .p-commend.p-commend-art{display:flex;gap:8px;align-items:center;border-left:0;padding-left:0}
.penguin-page .p-medal{width:34px;height:auto;flex:0 0 34px;animation:p-pin 520ms cubic-bezier(.2,1.5,.4,1)}
@keyframes p-pin{from{opacity:0;transform:translateY(-16px) rotate(-16deg) scale(1.5)}to{opacity:1;transform:none}}
.p-sendoff{flex-wrap:wrap}.p-sendoff .p-stamp-art{border:0;padding:0;width:112px;height:111px;top:12px;right:54px}
.p-sendoff .p-stamp-art img{display:block;width:100%;height:100%;filter:drop-shadow(0 0 1px #fff2d2)}
.p-sendoff .p-stamp-art span{position:absolute;left:19%;right:16%;top:66%;height:13%;display:flex;align-items:center;justify-content:center;color:#1845ff;font-size:10px}
.p-sendoff.p-has-stamp .p-sendoff-copy{padding-right:132px}
.p-exit{position:relative;flex:1 0 100%;height:146px;margin-top:4px;overflow:hidden;border-top:1px dashed #315dff80}
.p-exit .p-floe{position:absolute;left:0;bottom:0;width:66%;height:26px;background:#fff2d2;clip-path:polygon(0 34%,95% 0,100% 100%,0 100%)}
.p-exit .p-water{position:absolute;left:64%;right:0;bottom:0;height:22px;background:radial-gradient(circle,#e9faff 1px,transparent 1.7px) 0 0/6px 6px,#1845ff}
.p-exit .p-walker{position:absolute;bottom:22px;left:54%;width:92px;animation:p-dive 3.6s cubic-bezier(.45,0,.4,1) .7s both}
.p-exit .p-sprite{display:block;width:100%;height:auto;transform-origin:50% 100%;animation:p-waddle .3s ease-in-out .7s 7 alternate}
@keyframes p-waddle{from{transform:rotate(-6deg)}to{transform:rotate(6deg)}}
@keyframes p-dive{0%{left:2%;transform:none;opacity:1}55%{left:52%;transform:none}66%{left:54%;transform:none}74%{left:64%;transform:translateY(-40px) rotate(55deg)}86%{left:76%;transform:translateY(80px) rotate(140deg);opacity:1}88%,100%{left:76%;transform:translateY(80px) rotate(140deg);opacity:0}}
.p-exit .p-splash{position:absolute;left:calc(76% + 46px);bottom:10px;width:16px;height:16px;margin-left:-8px;border-radius:50%;box-shadow:0 0 0 2px #fff2d2,16px -12px 0 -4px #fff2d2,-18px -14px 0 -4px #fff2d2,2px -24px 0 -5px #fff2d2;opacity:0;animation:p-splash .9s ease-out 3.8s both}
@keyframes p-splash{0%{opacity:1;transform:scale(.3)}100%{opacity:0;transform:scale(2.7)}}
.p-exit .p-bubble{position:absolute;left:calc(54% + 84px);top:8px;background:#fff2d2;color:#11172c;font:700 13px var(--p-sans);padding:6px 11px;border-radius:12px;white-space:nowrap;opacity:0;animation:p-bubble .3s ease-out 2.6s both}
.p-exit .p-bubble:after{content:'';position:absolute;left:10px;bottom:-6px;border:6px solid transparent;border-top-color:#fff2d2;border-bottom:0}
@keyframes p-bubble{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.p-sendoff .p-encore{position:absolute;right:10px;bottom:30px;background:#09152ecc;border:1px solid #52638d;color:#c1cbed;border-radius:3px;padding:4px 8px}
@media(prefers-reduced-motion:reduce){.p-intro .p-bg,.penguin-page .p-dispatch-line,.penguin-page .p-medal,.p-exit .p-walker,.p-exit .p-sprite,.p-exit .p-bubble,.p-exit .p-splash{animation:none}.p-exit .p-bubble{opacity:1}.p-exit .p-splash{display:none}}
@container(max-width:640px){.penguin-page .p-dispatch-art{background:#09152e;border:1px solid #315dff;border-radius:3px;padding:10px 14px}.p-dispatch-art .p-dispatch-frame{display:none}.p-dispatch-art .p-dispatch-copy{position:static;width:auto;height:auto;color:#f5f2dc}.p-dispatch-art .p-dispatch-copy b{color:#69bcff}.p-dispatch-art .p-dispatch-line{font-size:13px;font-weight:400}.p-sendoff.p-has-stamp .p-sendoff-copy{padding-right:0}}
@container(max-width:480px){.p-sendoff .p-stamp-art{position:relative;top:auto;right:auto;display:block;width:86px;height:85px;margin:0 0 10px;transform:rotate(-9deg)}.p-exit .p-walker{width:66px}.p-exit .p-bubble{left:auto;right:8px;font-size:12px}}
`

// Optional music visualization. MiniMax 'Polar Frequency' track + offline features; no microphone, network stream
// or runtime analysis. Private test copy only: the track is not MIT and not cleared for redistribution.
const audioLabCss = `
.penguin-page.p-audio-prototype{--p-audio-pulse:0}
.p-audio-prototype .p-hero{isolation:isolate;background:linear-gradient(176deg,#08112c 0%,#0c1a4d 52%,#1638c8 86%,#1945ff 100%)}
.p-audio-prototype .p-hero>.p-sky{position:absolute;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;display:block}
.p-audio-prototype .p-polar-strip{display:flex;align-items:center;justify-content:space-between;gap:10px 16px;flex-wrap:wrap;margin:10px 2px 0;color:#c1cbed}
.p-polar-strip .p-polar-status{font:10px var(--p-mono);text-transform:uppercase;letter-spacing:1.7px;color:#c1cbed;min-width:0}
.p-polar-strip .p-polar-status b{color:#fff2d2;font-weight:400}
.p-polar-strip .p-polar-controls{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.p-polar-strip button{background:none;color:#c1cbed;border:1px solid #52638d;border-radius:3px;padding:5px 8px;font:10px var(--p-mono)}
.p-polar-strip button:hover{border-color:#91acff;color:#fff2d2}
.p-polar-strip button[aria-pressed=true]{border-color:#fff2d2;color:#fff2d2}
.p-polar-strip button.p-audio-play[data-playing=true]{border-color:#91acff;color:#fff2d2;background:#122954}
.p-polar-strip label{display:flex;align-items:center;gap:5px;font:10px var(--p-mono);color:#c1cbed}
.penguin-page .p-polar-strip input[type=range]{width:64px;height:20px;margin:0;padding:0;border:0;background:none;accent-color:#91acff}
.penguin-page .p-polar-strip input[type=checkbox]{margin:0}
.p-polar-strip .p-audio-state{flex:1 0 100%;font:10px var(--p-mono);color:#8fa3d6;min-height:14px}
.p-audio-prototype .p-clockcard{position:relative}.p-audio-prototype .p-clockcard:after{content:'';position:absolute;top:8px;right:10px;width:28px;height:3px;pointer-events:none;background:repeating-linear-gradient(90deg,#285aff 0 5px,transparent 5px 8px);opacity:calc(.12 + var(--p-audio-pulse)*.58);transition:opacity 120ms linear}
.p-audio-prototype[data-audio-still=true] .p-clockcard:after,.p-audio-prototype[data-audio-still=true] .p-sendoff .p-aurora{transition:none;animation:none}
@media(prefers-reduced-motion:reduce){.p-audio-prototype .p-clockcard:after{transition:none}}
@container(max-width:480px){.p-polar-strip{margin-top:8px}.p-polar-strip .p-polar-status{flex-basis:100%;font-size:9px;letter-spacing:1px}}
`

// Penguin halftone aurora. Fixed dot lattice; only dot size and ink change.
// Availability decides how far and how bright the light reaches; music only
// moves it (phase, sway, ray length, crest sparkle). Pure functions + painter.

export function polarAvailability(available,total,valid=true){
  const ratio=valid&&total>0?Math.max(0,Math.min(1,available/total)):0
  return {ratio,extent:valid?.30+.70*ratio:.22,light:valid?.16+.84*ratio:.10}
}

// Deterministic per-column hash (no Math.random): same lattice every render.
function hash(i){let x=Math.imul(i^0x9e3779b9,0x85ebca6b);x^=x>>>13;x=Math.imul(x,0xc2b2ae35);x^=x>>>16;return (x>>>0)/4294967296}

// Two asymmetric curtains, in hero-relative units (u: 0..1 across, v: 0..1 down).
// Left: a wide swoop that runs high over the headline, dips between copy and
// art, then lifts. Right: narrower, climbing behind the illustration.
const CURTAINS=[
  {from:-.03,to:.86,top:.10,depth:.50,t0:.66,s:.24,tilt:.04,width:.050,glow:.20,drip:.40,speed:.55,sway:.040,k:3.6},
  {from:.58,to:1.04,top:.70,depth:-.52,t0:1.0,s:.55,tilt:0,width:.042,glow:.16,drip:.30,speed:-.42,sway:.030,k:5.0}
]

export function curtainY(C,t,phase,low,c){
  return C.top+C.depth*Math.exp(-(((t-C.t0)/C.s)**2))+C.tilt*t
    +(C.sway*(1+1.6*low))*Math.sin(t*C.k+phase*C.speed*2.1+c*1.7)
    +.010*Math.sin(t*13.0-phase*C.speed*3.3+c)
}

export function polarIntensity(u,v,col,state){
  // Returns [body intensity 0..1, crest 0..1]. state: {extent, light, phase, low, mid}
  let I=0,K=0
  for(let c=0;c<CURTAINS.length;c++){
    const C=CURTAINS[c]
    // Availability widens each curtain from its own anchor side.
    const span=C.to-C.from, reach=state.extent
    const a=c===0?C.from:C.to-span*reach, b=c===0?C.from+span*reach:C.to
    if(u<a-.12||u>b+.12)continue
    const t=(u-C.from)/span
    const edge=Math.min(1,Math.max(0,(u-a)/.12),Math.max(0,(b-u)/.12))**1.5
    const d=v-curtainY(C,t,state.phase,state.low,c)
    const crest=Math.exp(-((d/C.width)**2))
    // Soft halftone body: wider above the crest (the curtain), short below.
    const body=.92*Math.exp(-(Math.abs(d/(d<0?C.glow:C.glow*.38))**1.35))
    let ray=0
    if(d>0&&hash(col*7+c*131)>.42){const len=C.drip*(.3+.7*hash(col*13+c))*(.7+.5*state.mid);ray=d<len?.62*(1-d/len)**1.05:0}
    I=Math.max(I,edge*Math.min(1,Math.max(body,ray)))
    K=Math.max(K,edge*crest)
  }
  return [Math.min(1,I*state.light),K*state.light]
}

// Halftone painter. Lattice pitch in CSS px; dots never move, only resize/recolour.
function paintPolar(canvas,scene,motion,opts={}){
  const g=canvas.getContext('2d');if(!g)return
  const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return
  const dpr=Math.min(1.5,window.devicePixelRatio||1)
  const W=Math.round(w*dpr),H=Math.round(h*dpr)
  if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H}
  g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h)
  const a=polarAvailability(scene.available,scene.total,scene.valid)
  const pitch=opts.pitch||(w<520?7:9),half=pitch/2
  const state={extent:scene.extent??a.extent,light:scene.light??a.light,phase:motion.phase||0,low:motion.low||0,mid:motion.mid||0,high:motion.high||0}
  const scrim=opts.scrim // {x0,y0,x1,y1} in px: keep copy readable
  const cols=Math.ceil(w/pitch)+1,rows=Math.ceil(h/pitch)+1
  const blue=[],cream=[],deep=[]
  for(let j=0;j<rows;j++){
    const y=j*pitch+half, v=y/h
    for(let i=0;i<cols;i++){
      const x=i*pitch+half,u=x/w
      let [I,K]=polarIntensity(u,v,i,state)
      const under=scrim&&x>scrim.x0&&x<scrim.x1&&y>scrim.y0&&y<scrim.y1
      if(under){I=Math.min(I*.75,.42);K=0}
      // Crest sparkle on onsets: a few existing lattice points flare, never new points.
      if(motion.sparkle&&K>.35&&hash(i*31+j*17+((motion.beat|0)*97))>.9)K=Math.min(1,K+.4*motion.sparkle)
      if(K>.62){cream.push(x,y,half*(.42+.40*K));continue}
      if(I<.07){if(((i+j)&3)===0)deep.push(x,y,.55);continue}
      blue.push(x,y,Math.max(.7,half*.88*Math.pow(I,.62)))
    }
  }
  const draw=(list,colour)=>{g.fillStyle=colour;g.beginPath();for(let k=0;k<list.length;k+=3){g.moveTo(list[k]+list[k+2],list[k+1]);g.arc(list[k],list[k+1],list[k+2],0,6.2832)}g.fill()}
  draw(deep,'#22336f');draw(blue,opts.blueInk||'#2f5bff');draw(cream,'#fff2d2')
  canvas.dataset.extent=state.extent.toFixed(3);canvas.dataset.light=state.light.toFixed(3);canvas.dataset.phase=state.phase.toFixed(4)
}

// Offline features (25 fps) → motion at a playback time. No analysis at runtime.
export function featuresAt(features,time){
  if(!features)return {low:0,mid:0,high:0,onset:0,beat:0}
  const n=features.low.length,p=((time%features.duration)+features.duration)%features.duration*features.fps
  const i=Math.floor(p)%n,j=(i+1)%n,f=p-Math.floor(p)
  const at=k=>(features[k][i]*(1-f)+features[k][j]*f)/99
  const beatT=(time-features.beatOffset)*features.bpm/60
  return {low:at('low'),mid:at('mid'),high:at('high'),onset:at('onset'),beat:Math.floor(beatT),beatPhase:beatT-Math.floor(beatT)}
}

export function polarStep(previous,feat,dt,playing){
  const step=Math.max(0,Math.min(.1,dt))
  const follow=(v,t,att,rel)=>v+(t-v)*(1-Math.exp(-step/(t>v?att:rel)))
  const low=follow(previous.low||0,playing?feat.low:0,.35,1.4)
  const mid=follow(previous.mid||0,playing?feat.mid:0,.45,1.6)
  const high=follow(previous.high||0,playing?feat.high:0,.2,.8)
  const sparkle=playing?Math.max((previous.sparkle||0)*Math.exp(-step/.35),feat.onset>.6?feat.onset:0):0
  // Slow drift: ~0.12 rad/s idle in music, up to ~0.5 at full energy. Never a beat-by-beat jolt.
  const phase=(previous.phase||0)+(playing?step*(.12+.30*low+.10*mid):0)
  return {low,mid,high,sparkle,phase,beat:feat.beat||0}
}


// Gesture-started audio: the MiniMax "Polar Frequency" track plus features
// analysed offline from that same file. Nothing is analysed or generated at runtime.
function createPolarAudio(ctx) {
  let state={status:'stopped',volume:30,muted:false,still:false,error:''}
  const listeners=new Set()
  let context=null,master=null,source=null,buffer=null,features=null
  let position=0,startedAt=0,generation=0,disposed=false
  const emit=patch=>{state={...state,...patch};listeners.forEach(fn=>fn(state))}
  function applyGain(){
    if(!context||context.state==='closed')return
    master.gain.setTargetAtTime(state.muted?0:state.volume/100,context.currentTime,.03)
  }
  function pause(status='paused'){
    generation++
    if(source){position=(position+context.currentTime-startedAt)%buffer.duration;source.stop();source.disconnect();source=null}
    if(context&&context.state!=='closed')void context.suspend().catch(()=>{})
    emit({status})
  }
  function stop(){pause('stopped');position=0}
  async function load(token){
    const [music,feat]=await Promise.all([ctx.rest('/audio-lab/music',{method:'GET'}),features?null:ctx.rest('/audio-lab/features',{method:'GET'})])
    if(disposed||token!==generation)return false
    if(feat)features=feat
    const bytes=Uint8Array.from(atob(music.base64),c=>c.charCodeAt(0))
    buffer=await context.decodeAudioData(bytes.buffer)
    return !disposed&&token===generation
  }
  async function play(){
    if(disposed||state.status==='playing'||state.status==='starting')return
    const token=++generation
    emit({status:'starting',error:''})
    try{
      if(!context){context=new AudioContext();master=context.createGain();master.gain.value=0;master.connect(context.destination)}
      if(!buffer&&!(await load(token)))return
      await context.resume()
      if(disposed||token!==generation)return
      source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(master)
      startedAt=context.currentTime;source.start(0,position%buffer.duration)
      emit({status:'playing'});applyGain()
    }catch{
      if(disposed||token!==generation)return
      stop();emit({status:'error',error:'Music unavailable. The meeting planner still works.'})
    }
  }
  function audible(){return state.status==='playing'&&!state.muted&&state.volume>0&&!!buffer}
  function time(){return audible()?(position+context.currentTime-startedAt)%buffer.duration:0}
  function dispose(){
    if(disposed)return
    stop();disposed=true
    master?.disconnect()
    if(context&&context.state!=='closed')void context.close().catch(()=>{})
    listeners.clear()
  }
  return {
    snapshot:()=>state,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn)},
    play,pause,stop,dispose,audible,
    features:()=>audible()?featuresAt(features,time()):null,
    setVolume:value=>{emit({volume:Math.max(0,Math.min(100,value))});applyGain()},
    toggleMute:()=>{emit({muted:!state.muted});applyGain()},
    setStill:value=>emit({still:value})
  }
}

// Paints into the hero sky; renders the slim status/control strip under the hero.
function PolarConsole({audio,rootRef,skyRef,heroCopyRef,available,total,valid,pending}){
  const sceneRef=useRef(null),repaint=useRef(null)
  const [state,setState]=useState(audio.snapshot)
  const [systemStill,setSystemStill]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(()=>audio.subscribe(setState),[audio])
  const target=polarAvailability(available,total,valid)
  sceneRef.current={...sceneRef.current,target,available,total,valid}
  useEffect(()=>{
    const root=rootRef.current,canvas=skyRef.current,media=matchMedia('(prefers-reduced-motion: reduce)')
    if(!root||!canvas)return
    let motion={low:0,mid:0,high:0,sparkle:0,phase:0,beat:0},last=0
    let shown={...sceneRef.current.target},reducedMotion=media.matches
    // Keep the preference from change events instead of polling a live
    // MediaQueryList during every animation frame.
    const still=()=>audio.snapshot().still||reducedMotion
    const scrim=()=>{
      const copy=heroCopyRef.current,hero=canvas.parentElement
      if(!copy||!hero)return null
      const r=hero.getBoundingClientRect(),t=copy.getBoundingClientRect()
      return {x0:t.left-r.left-14,y0:t.top-r.top-10,x1:t.right-r.left+12,y1:t.bottom-r.top+8}
    }
    const paint=()=>paintPolar(canvas,{...sceneRef.current,extent:shown.extent,light:shown.light},motion,{scrim:scrim()})
    // Availability eases in/out even when silent; music only moves the light.
    const settling=()=>{const t=sceneRef.current.target;return Math.abs(shown.extent-t.extent)>.002||Math.abs(shown.light-t.light)>.002}
    const flowing=()=>audio.audible()&&!still()
    const idle=()=>!flowing()&&!settling()
    const loop=createBudgetedLoop(now=>{
      const dt=last?(now-last)/1000:.05;last=now
      const t=sceneRef.current.target,k=still()?1:1-Math.exp(-Math.min(.1,dt)/.28)
      shown={extent:shown.extent+(t.extent-shown.extent)*k,light:shown.light+(t.light-shown.light)*k}
      const feat=flowing()?audio.features():null
      motion=polarStep(motion,feat||{low:0,mid:0,high:0,onset:0,beat:motion.beat},dt,!!feat)
      const pulse=feat?Math.max(0,1-feat.beatPhase*3)*(.35+.65*feat.onset):0
      root.style.setProperty('--p-audio-pulse',pulse.toFixed(3))
      root.dataset.audioActive=String(!!feat);root.dataset.audioStill=String(still())
      paint()
      if(idle())last=0
    },{fps:20,idleWhen:idle})
    const update=()=>{
      const s=audio.snapshot()
      root.dataset.audioActive=String(audio.audible()&&!still());root.dataset.audioStill=String(still())
      if(!audio.audible()||still())root.style.setProperty('--p-audio-pulse','0')
      if(still())shown={...sceneRef.current.target}
      paint();loop.wake()
    }
    const unsubscribe=audio.subscribe(update)
    const changeMotion=event=>{reducedMotion=event.matches;setSystemStill(reducedMotion);update()}
    // Hidden or minimised pages pause the music. Returning never auto-resumes it.
    const hide=()=>{if(document.hidden)audio.pause()}
    media.addEventListener('change',changeMotion);document.addEventListener('visibilitychange',hide)
    repaint.current=()=>{if(still())shown={...sceneRef.current.target};paint();loop.wake()}
    const resize=new ResizeObserver(()=>paint());resize.observe(canvas)
    update()
    return()=>{loop.dispose();unsubscribe();resize.disconnect();repaint.current=null;media.removeEventListener('change',changeMotion);document.removeEventListener('visibilitychange',hide);audio.stop();root.style.setProperty('--p-audio-pulse','0')}
  },[audio,rootRef,skyRef,heroCopyRef])
  useEffect(()=>{repaint.current?.()},[available,total,valid])
  const playing=state.status==='playing',starting=state.status==='starting'
  const message=state.error||(starting?'Tuning in to Polar Frequency…':playing?(state.muted||!state.volume?'Muted · the sky rests':state.still||systemStill?'Playing · still sky':'Playing · the music moves the light; the colony sets how far it reaches'):'Sound is off · the sky still shows who can make it')
  return h('div',{className:'p-polar-strip','aria-label':'Antarctic sky and music'},
    h('span',{className:'p-polar-status',role:'status'},pending?'Checking the colony…':valid?h(Fragment,{},h('b',{},`${available} / ${total} can fit the full meeting`),' · the sky follows the colony'):'Choose a valid meeting time'),
    h('span',{className:'p-polar-controls'},
      h('button',{className:'p-audio-play','data-playing':playing,disabled:starting,onClick:()=>playing?audio.pause():audio.play(),'aria-label':playing?'Pause Polar Frequency':'Play Polar Frequency'},starting?'Tuning…':playing?'❚❚ Pause':'♪ Polar Frequency'),
      h('button',{onClick:audio.toggleMute,'aria-pressed':state.muted,disabled:!playing,'aria-label':state.muted?'Unmute music':'Mute music'},state.muted?'Unmute':'Mute'),
      h('label',{},'Vol',h('input',{type:'range',min:0,max:100,step:1,value:state.volume,'aria-label':'Music volume',onChange:e=>audio.setVolume(Number(e.target.value))})),
      h('label',{},h('input',{type:'checkbox',checked:state.still||systemStill,disabled:systemStill,onChange:e=>audio.setStill(e.target.checked)}),'Still sky')),
    h('span',{className:'p-audio-state'},h('span',{},message),' · ',h('span',{},'AI-generated music · MiniMax')))
}

const kitCache=new WeakMap()
function useKit(ctx) {
  const [kit,setKit]=useState(()=>kitCache.get(ctx)?.value||null)
  useEffect(()=>{
    let active=true,entry=kitCache.get(ctx)
    if(!entry){
      entry={value:null}
      entry.promise=ctx.rest('/art/kit',{method:'GET'}).then(r=>{
        entry.value=r&&r.background&&r.banner&&r.medal&&r.stamp?r:null
        // Keep successful/in-flight loads shared; a temporary outage must not
        // poison future mounts (including Replay arrival) with a cached null.
        if(!entry.value)kitCache.delete(ctx)
        return entry.value
      }).catch(()=>{kitCache.delete(ctx);return null})
      kitCache.set(ctx,entry)
    }
    setKit(entry.value)
    entry.promise.then(v=>{if(active&&v)setKit(v)})
    return()=>{active=false}
  },[ctx])
  return kit
}

function CommanderSprite() {
  // The commander from the side: chubby, long coat with fur collar and belt, goggles up, flippers clasped behind.
  return h('svg',{viewBox:'0 0 120 132',className:'p-sprite'},
    h('defs',{},h('pattern',{id:'p-coat-dots',width:4,height:4,patternUnits:'userSpaceOnUse'},h('circle',{cx:2,cy:2,r:.8,fill:'#1845ff',opacity:.4}))),
    h('ellipse',{cx:48,cy:126,rx:12,ry:4.5,fill:'#e6aa48',stroke:'#11172c',strokeWidth:1}),h('ellipse',{cx:72,cy:126,rx:12,ry:4.5,fill:'#e6aa48',stroke:'#11172c',strokeWidth:1}),
    h('ellipse',{cx:58,cy:78,rx:43,ry:47,fill:'#11172c'}),
    h('path',{d:'M17 64 Q7 98 22 123 L84 123 Q96 100 90 72 Q85 50 72 46 L40 45 Q23 50 17 64 Z',fill:'#f1e3c4',stroke:'#11172c',strokeWidth:2.2}),
    h('path',{d:'M17 64 Q7 98 22 123 L84 123 Q96 100 90 72 Q85 50 72 46 L40 45 Q23 50 17 64 Z',fill:'url(#p-coat-dots)'}),
    h('ellipse',{cx:82,cy:88,rx:11,ry:27,fill:'#fcfaf1',stroke:'#11172c',strokeWidth:1.6}),
    h('rect',{x:16,y:91,width:72,height:7,fill:'#11172c'}),h('rect',{x:60,y:89,width:9,height:11,rx:1.5,fill:'#e6aa48',stroke:'#11172c',strokeWidth:1.2}),
    h('path',{d:'M30 70 L50 72 M29 77 L49 79',stroke:'#1845ff',strokeWidth:3.2}),
    h('path',{d:'M19 98 Q3 108 14 117 Q26 115 29 104 Z',fill:'#11172c'}),
    h('path',{d:'M28 47 Q50 33 78 44 Q75 56 53 58 Q35 58 28 47 Z',fill:'#fff2d2',stroke:'#11172c',strokeWidth:2}),
    h('rect',{x:34,y:46,width:13,height:5,rx:1,fill:'#1845ff',stroke:'#11172c',strokeWidth:1}),
    h('circle',{cx:67,cy:27,r:21,fill:'#11172c'}),
    h('ellipse',{cx:74,cy:31,rx:9,ry:10.5,fill:'#fcfaf1'}),h('circle',{cx:77,cy:27,r:2.5,fill:'#11172c'}),
    h('path',{d:'M84 28 L108 34 L84 39 Z',fill:'#e6aa48',stroke:'#11172c',strokeWidth:1.5}),
    h('rect',{x:53,y:9,width:28,height:10,rx:4.5,fill:'#1845ff',stroke:'#fff2d2',strokeWidth:1.6}),
    h('path',{d:'M46 16 L53 14',stroke:'#11172c',strokeWidth:3.2}))
}

function ExitStage() {
  const [run,setRun]=useState(0)
  return h(Fragment,{},h('div',{className:'p-exit','aria-hidden':true,key:'stage'+run},
      h('div',{className:'p-floe'}),h('div',{className:'p-water'}),h('div',{className:'p-splash'}),
      h('div',{className:'p-bubble'},'I’ll be back.'),h('div',{className:'p-walker'},h(CommanderSprite))),
    h('button',{className:'p-encore',key:'encore',onClick:()=>setRun(run+1),'aria-label':'Replay the commander’s exit'},'Encore'))
}

function SendOff({ctx,slot,onClose,nodeRef,previewOnly=false}) {
  const kit=useKit(ctx)
  const [artReady,setArtReady]=useState(false)
  return h('section',{ref:nodeRef,className:'p-sendoff'+(kit?' p-has-stamp':'')+(previewOnly?' p-export-card':''),'data-export-ready':kit&&artReady?'true':'false','aria-label':previewOnly?'Existing meeting proposal card':'Meeting proposal completed'},
    h('div',{className:'p-aurora','aria-hidden':true}),kit?h('div',{className:'p-stamp p-stamp-art','aria-hidden':true},h('img',{src:kit.stamp,alt:''}),h('span',{},'APPROVED')):h('div',{className:'p-stamp','aria-hidden':true},'APPROVED · COMMANDER PENGUIN'),h(PenguinArt,{ctx,onReady:setArtReady}),
    h('div',{className:'p-sendoff-copy'},h('h2',{},previewOnly?'MEETING PROPOSAL · NOT SENT':'PROPOSAL COPIED · TRANSMISSION COMPLETE'),
      h('h3',{},'Dismissed. See you next time in the Antarctic control room.'),
      h('div',{className:'p-final-times'},...slot.members.map((m,i)=>h('span',{key:i},`${m.name} ${m.start.local.slice(11,16)}`,h('time',{className:'p-final-date',dateTime:m.start.date},m.start.date)))),
      h('p',{},'Share the proposal and confirm availability. No calendar event has been created.')),
    !previewOnly&&h(ExitStage,{}),
    !previewOnly&&h('button',{className:'p-close',onClick:onClose,'aria-label':'Close send-off'},'×'))
}

function ControlRoom({ctx,onContinue}) {
  const kit=useKit(ctx)
  useEffect(()=>{const timer=setTimeout(onContinue,3600);return()=>clearTimeout(timer)},[])
  return h('section',{className:'p-intro'+(kit?' p-intro-art':''),'aria-label':'Antarctic control room'},
    kit&&h('div',{className:'p-bg','aria-hidden':true,style:{backgroundImage:`url(${kit.background})`}}),
    h('div',{className:'p-mountains','aria-hidden':true}),h('div',{className:'p-ice','aria-hidden':true}),h('div',{className:'p-station','aria-hidden':true}),
    h('div',{className:'p-console'},h(PenguinArt,{ctx}),h('h1',{},'Your time is under my command.'),
      h('p',{},'COMMANDER PENGUIN · YOUR SHARED MOMENT AWAITS'),h('button',{onClick:onContinue},'Skip intro')))
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

function PenguinArt({ctx,onReady}) {
  const [src,setSrc]=useState('')
  useEffect(()=>{
    let active=true
    onReady?.(false)
    ctx.rest('/art',{method:'GET'}).then(r=>{if(active&&r.src){setSrc(r.src);onReady?.(true)}}).catch(()=>{})
    return()=>{active=false}
  },[ctx,onReady])
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

function zoneLabel(name) {return name.split('/').flatMap((part,i)=>i?[h('wbr',{key:i}),'/'+part]:[part])}

function city(zone) {return zone.split('/').pop().replace(/_/g,' ')}
function names(list) {return list.length<2?list[0]:list.slice(0,-1).join(', ')+' and '+list[list.length-1]}
const commendations=[
  (m,v)=>`${m.name} holds the ${v.start.local.slice(11,16)} watch in ${city(m.zone)}. Commended.`,
  (m)=>`${m.name} did not choose ${m.zone}. ${m.name} showed up anyway. Commended.`,
  (m)=>`Medal awarded to ${m.name}: Outstanding Endurance of Time Zones.`,
  (m)=>`The Commander cannot move ${city(m.zone)}. The Commander respects ${m.name} for not asking.`
]
function dispatch({pending,view,error}) {
  if(pending)return 'Consulting every clock on Earth. Stand by.'
  if(error?.code==='ambiguous_local_time')return 'This hour happens twice. Choose one. The Commander does not do time travel.'
  if(error?.code==='nonexistent_local_time')return 'Daylight saving skipped that minute. It does not exist. Choose another.'
  if(error?.code==='invalid_time')return 'That is not a time. Twenty-four hours, soldier. HH:MM.'
  if(error)return 'Orders unclear. Check the highlighted message, then report back.'
  if(!view)return 'Awaiting orders.'
  const away=view.members.filter(m=>!m.available).map(m=>m.name)
  if(!away.length)return `All ${view.members.length} stations green. Humans who cannot move their time zones: you are commended.`
  if(away.length===view.members.length)return 'Every station is off duty. Even the Commander would decline this meeting.'
  return `${names(away)} would be outside work hours. Request denied. Nobody gets dragged into overtime on my watch.`
}

function Dispatch({ctx,text}) {
  const kit=useKit(ctx)
  return h('section',{className:'p-dispatch'+(kit?' p-dispatch-art':''),'aria-label':'Commander dispatch'},
    kit&&h('img',{src:kit.banner,alt:'',className:'p-dispatch-frame'}),
    h('div',{className:'p-dispatch-copy'},h('b',{},'Commander'),h('span',{className:'p-dispatch-line',key:text},text)))
}

function ClockCard({ctx,member,view,index,pending}) {
  const kit=useKit(ctx)
  const [salute,setSalute]=useState(-1)
  useEffect(()=>setSalute(-1),[member.name,member.zone])
  return h('article',{className:`p-clockcard ${view?(view.available?'p-good':'p-away'):''}`},
    h('div',{className:'p-row'},h('span',{className:'p-avatar'},String(index+1)),h('h3',{},member.name)),
    h('div',{className:'p-zone',title:member.zone},...zoneLabel(member.zone)),
    h('div',{className:'p-time'},view?view.start.local.slice(11,16):'—:—'),
    h('div',{className:'p-small'},view?`${view.start.date} · ${view.start.weekday}`:'Waiting for a valid time'),
    h('div',{className:'p-small',style:{marginTop:5}},view?`Until ${view.end.local.slice(11,16)}${view.end.date!==view.start.date?' · '+view.end.date:''}`:' '),
    h('div',{className:'p-small'},view?`UTC${view.start.local.slice(16)}${view.start.is_dst?' · DST':''}`:' '),
    view&&h('div',{},h('div',{className:'p-daybar','aria-hidden':true},
      ...daySegments(member,view.start.weekday).map(([a,b],i)=>h('span',{className:'p-work',key:i,style:{left:`${a/14.4}%`,width:`${(b-a)/14.4}%`}})),
      h('span',{className:'p-marker',style:{left:`${clockMinutes(view.start.local.slice(11,16))/14.4}%`}})),
      h('div',{className:'p-ticks'},...['00','06','12','18','24'].map(x=>h('span',{key:x},x)))),
    h('span',{className:'p-badge'},view?(view.available?'✓ FULL MEETING FITS':'OUTSIDE WORK HOURS'):pending?'CHECKING…':'NO VALID TIME'),
    view&&h('button',{className:'p-salute',onClick:()=>setSalute((salute+1)%commendations.length),'aria-label':`Salute ${member.name}`},'SALUTE'),
    view&&salute>=0&&h('p',{className:'p-commend'+(kit?' p-commend-art':''),role:'status'},kit&&h('img',{src:kit.medal,alt:'',className:'p-medal',key:salute}),h('span',{},commendations[salute](member,view))),
    view&&view.start.offset_minutes!==view.end.offset_minutes&&h('p',{className:'p-small'},`Clock changes during meeting → UTC${view.end.local.slice(16)}`))
}

function Planner({ctx,profile,audioFactory}) {
  const audioRootRef=useRef(null),skyRef=useRef(null),heroCopyRef=useRef(null)
  const [audio]=useState(audioFactory)
  useEffect(()=>()=>audio.dispose(),[audio])
  const [intro,setIntro]=useState(true)
  const [team,setTeam]=useState(sample), [teamId,setTeamId]=useState('aurora-demo')
  const [date,setDate]=useState('2026-11-16'), [reference,setReference]=useState('Asia/Taipei'), [duration,setDuration]=useState('60')
  const [time,setTime]=useState('21:00'), [ambiguity,setAmbiguity]=useState('reject')
  const [view,setView]=useState(null), [previewError,setPreviewError]=useState(null), [previewPending,setPreviewPending]=useState(true)
  const [completed,setCompleted]=useState(null)
  const [handoffMode,setHandoffMode]=useState(null)
  const sendOffRef=useRef(null)
  const [result,setResult]=useState(null), [notice,setNotice]=useState(''), [busy,setBusy]=useState(false), [manual,setManual]=useState('')
  const generation=useRef(0), previewGeneration=useRef(0), epoch=useRef(gatewayActivationEpoch())
  function resetScope(){
    generation.current++;previewGeneration.current++;epoch.current=gatewayActivationEpoch()
    setTeam(sample());setTeamId('aurora-demo');setResult(null);setView(null);setManual('');setBusy(false);setCompleted(null);setHandoffMode(null);setPreviewPending(true)
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
      }catch{if(seq===previewGeneration.current&&captured===gatewayActivationEpoch()){setView(null);setPreviewError({message:'Enable Penguin’s agent plugin and restart the gateway to connect this planner.'})}}
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
  const handoffSelection={team,reference_zone:reference,local_time:`${date}T${time}`,duration_minutes:Number(duration),ambiguity}
  const handoffScope=epoch.current
  return h('main',{className:'penguin-page p-audio-prototype',ref:audioRootRef},h('style',{},css+introCss+experienceCss+kitCss+audioLabCss+handoffCss),intro?h(ControlRoom,{ctx,onContinue:()=>setIntro(false)}):h('div',{className:'p-wrap'},
    h('header',{className:'p-top'},h(Wordmark),h('button',{className:'p-replay',onClick:()=>setIntro(true)},'Replay arrival'),h('span',{className:'p-tag'},`ANTARCTIC TIMEKEEPER · ${profile}`)),
    h('section',{className:'p-hero'},h('canvas',{className:'p-sky',ref:skyRef,'aria-hidden':true}),h('div',{ref:heroCopyRef},h('span',{className:'p-badge'},'MANY PLACES. ONE MOMENT.'),
      h('h1',{},'The world runs on different hours.'),h('p',{className:'p-lead'},'One cool penguin. A whole world of teammates. Find your shared moment from the Antarctic control room.')),h(PenguinArt,{ctx})),
    h(PolarConsole,{audio,rootRef:audioRootRef,skyRef,heroCopyRef,available:view?.members.filter(m=>m.available).length||0,total:team.members.length,valid:!!view&&!previewPending,pending:previewPending}),
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
    h('section',{className:'p-clocks','aria-label':'Side-by-side team clocks','aria-busy':previewPending},...team.members.map((member,i)=>h(ClockCard,{key:i,ctx,index:i,member,view:view?.members[i],pending:previewPending}))),
    h('section',{className:'p-summary','aria-live':'polite'},
      h('div',{},h('h2',{},previewPending?'Updating everyone’s clocks…':view?`${view.members.filter(m=>m.available).length} of ${team.members.length} can fit the full meeting`:'Choose a valid time to compare'),
        h('div',{className:'p-small'},view?`${view.start_utc} → ${view.end_utc} · IANA ${view.database.iana_version}`:'Penguin checks the whole meeting, including daylight-saving transitions.'),
        completed&&h('p',{className:'p-small',role:'status'},'Proposal copied. No calendar event created. ',h('button',{className:'p-link',onClick:()=>sendOffRef.current?.scrollIntoView({block:'start',behavior:'instant'})},'View send-off ↓'))),
      h('button',{className:'p-primary',disabled:!view||previewPending,onClick:copy},'Copy meeting proposal ↗')),
    h(Dispatch,{ctx,text:dispatch({pending:previewPending,view,error:previewError})}),
    notice&&!completed&&h('div',{className:'p-status',role:'status'},notice),manual&&h('pre',{className:'p-manual',tabIndex:0,'aria-label':'Meeting proposal to copy'},manual),
    completed&&h(SendOff,{ctx,slot:completed,nodeRef:sendOffRef,onClose:()=>setCompleted(null)}),
    h('div',{className:'p-handoff-actions','aria-label':'Private offline integration prototype'},
      h('button',{className:'p-secondary',disabled:!view||previewPending,onClick:()=>setHandoffMode('share')},'Share existing card · preview'),
      h('button',{className:'p-secondary',disabled:!view||previewPending,onClick:()=>setHandoffMode('calendar')},'Calendar invitation · preview')),
    handoffMode&&view&&!previewPending&&h(OfflineHandoff,{key:profile+handoffMode+JSON.stringify(handoffSelection),ctx,selection:handoffSelection,slot:view,mode:handoffMode,onClose:()=>setHandoffMode(null),scopeValid:()=>handoffScope===gatewayActivationEpoch(),renderCard:nodeRef=>h(SendOff,{ctx,slot:view,nodeRef,previewOnly:true})}),
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

function PenguinPage({ctx,audioFactory}) {
  const profile=useValue(host.state.profile)
  return h(Planner,{ctx,profile,audioFactory,key:profile})
}

export default {
  id:'penguin', name:'Penguin', defaultEnabled:false,
  register(ctx) {
    const sessions=new Set()
    const audioFactory=()=>{
      const audio=createPolarAudio(ctx),dispose=audio.dispose
      audio.dispose=()=>{dispose();sessions.delete(audio)}
      sessions.add(audio)
      return audio
    }
    ctx.onDispose(()=>{for(const audio of sessions)audio.dispose();sessions.clear()})
    ctx.registerMany([
      {id:'page',area:ROUTES_AREA,data:{path:'/penguin'},render:()=>h(PenguinPage,{ctx,audioFactory})},
      {id:'nav',area:SIDEBAR_NAV_AREA,data:{path:'/penguin',label:'Penguin',codicon:'globe'}}
    ])
  }
}
