import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {writeFile,readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {dependency,evidence,url,root} from './config.mjs'
const {chromium}=await dependency('playwright')
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true})
const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:2})
const out=[],errors=[],requests=[]
page.on('pageerror',e=>errors.push(e.message))
page.on('request',r=>{if(r.url().includes('/audio-lab/'))requests.push(r.url())})
await page.addInitScript(()=>{
 const Native=AudioContext;window.__contexts=[]
 window.AudioContext=class extends Native{
  constructor(...args){super(...args);this.testGains=[];this.testSources=[];window.__contexts.push(this)}
  createGain(){const g=super.createGain();this.testGains.push(g);return g}
  createBufferSource(){const s=super.createBufferSource();this.testSources.push(s);return s}
  async decodeAudioData(...args){const b=await super.decodeAudioData(...args);this.testDuration=b.duration;return b}
 }
 Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{}}})
})
const ok=(name,detail)=>out.push({name,status:'passed',detail})
const start=async()=>{await page.goto(url);await page.getByRole('button',{name:'Skip intro',exact:true}).click();await page.getByRole('heading',{name:'4 of 4 can fit the full meeting'}).waitFor();await settle(1)}
const sky=async()=>{const s=await page.locator('.p-sky').evaluate(c=>({phase:Number(c.dataset.phase),light:Number(c.dataset.light),extent:Number(c.dataset.extent),hash:c.toDataURL(),width:c.width,cssWidth:c.clientWidth}));s.hash=createHash('sha256').update(s.hash).digest('hex');return s}
const settle=light=>page.waitForFunction(n=>Math.abs(Number(document.querySelector('.p-sky')?.dataset.light)-n)<.003,light)
const frozen=async()=>{await page.waitForTimeout(120);const a=await sky();await page.waitForTimeout(350);const b=await sky();assert.equal(b.hash,a.hash);return {phase:a.phase,light:a.light}}
const play=async()=>{await page.getByRole('button',{name:'Play Polar Frequency',exact:true}).click();await page.getByRole('button',{name:'Pause Polar Frequency',exact:true}).waitFor()}
try{
 await start();assert.equal(await page.evaluate(()=>__contexts.length),0);assert.equal(requests.length,0);ok('No AudioContext or music/features download before Play')
 await frozen();const initial=await sky();assert.ok(initial.width<=initial.cssWidth*1.5+1);ok('Silent hero stays still, availability visible, device pixel ratio capped')
 await play();await page.waitForFunction(()=>__contexts[0].state==='running')
 const phase=(await sky()).phase;await page.waitForTimeout(900);assert.ok((await sky()).phase>phase+.03)
 const f=JSON.parse(await readFile(resolve(root,'assets/audio-lab/polar-frequency.features.json')))
 const duration=await page.evaluate(()=>__contexts[0].testDuration);assert.ok(Math.abs(duration-f.duration)<1/f.fps)
 ok('Actual MP3 decodes, plays and advances the offline-feature sky',{decodedDuration:duration,featureDuration:f.duration})
 await page.getByRole('button',{name:'Mute music',exact:true}).click();await frozen();await page.waitForTimeout(200)
 assert.ok(await page.evaluate(()=>__contexts[0].testGains[0].gain.value<.001));ok('Mute rests sky and sets master gain to zero')
 await page.getByRole('button',{name:'Unmute music',exact:true}).click()
 await page.getByRole('slider',{name:'Music volume',exact:true}).fill('0');await frozen();ok('Zero volume rests sky')
 await page.getByRole('slider',{name:'Music volume',exact:true}).fill('30')
 await page.getByRole('checkbox',{name:'Still sky',exact:true}).check();await frozen()
 assert.equal(await page.evaluate(()=>__contexts[0].state),'running');ok('Still sky freezes image while audio context runs')
 await page.getByRole('checkbox',{name:'Still sky',exact:true}).uncheck()
 for(let i=0;i<3;i++){
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('.p-polar-strip input[type=checkbox]').disabled);await frozen()
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>!document.querySelector('.p-polar-strip input[type=checkbox]').disabled)
 }
 ok('System reduced motion freezes image and owns the control across three live toggles')
 const time=page.getByRole('textbox',{name:'Selected reference time'})
 await time.fill('23:00');await page.getByRole('heading',{name:'3 of 4 can fit the full meeting'}).waitFor();await settle(.79)
 assert.match(await page.locator('.p-clockcard').first().innerText(),/OUTSIDE WORK HOURS/);ok('23:00 gives 3/4 and Mika off duty while music remains playing')
 await page.getByRole('textbox',{name:'Reference time zone',exact:true}).fill('Asia/Tokyo');await time.fill('21:00');await page.getByRole('heading',{name:'2 of 4 can fit the full meeting'}).waitFor();await settle(.58)
 const half=await sky();await page.getByRole('button',{name:'Mute music',exact:true}).click();await page.getByRole('button',{name:'Unmute music',exact:true}).click()
 assert.ok(Math.abs((await sky()).light-half.light)<.003);ok('Mute/unmute cannot change 2/4 availability')
 await time.fill('99:99');await page.locator('.p-clockcard .p-badge').filter({hasText:'NO VALID TIME'}).first().waitFor();assert.ok(await page.getByRole('button',{name:'Copy meeting proposal ↗'}).isDisabled());await settle(.10);ok('Invalid time dims sky and disables copy')
 await page.getByRole('textbox',{name:'Reference time zone',exact:true}).fill('Asia/Taipei');await time.fill('21:00');await settle(1)
 await page.route('**/api/plugins/penguin/preview',async r=>{await new Promise(resolve=>setTimeout(resolve,700));await r.continue()})
 await time.fill('22:00');await page.getByText('Checking the colony…',{exact:true}).waitFor();assert.ok(await page.getByRole('button',{name:'Copy meeting proposal ↗'}).isDisabled());await page.getByRole('heading',{name:'4 of 4 can fit the full meeting'}).waitFor();await page.unroute('**/api/plugins/penguin/preview');ok('Pending results are labelled and cannot be copied')
 assert.deepEqual(await page.locator('.p-clockcard .p-time').allTextContents(),['22:00','09:00','14:00','06:00']);ok('Four dated clocks update during playback')
 await page.getByRole('slider',{name:'Reference time slider',exact:true}).fill('1260');await page.waitForFunction(()=>document.querySelector('.p-clocks').getAttribute('aria-busy')==='false');assert.equal(await time.inputValue(),'21:00');ok('Reference slider updates the selected time and backend preview')
 await page.getByRole('button',{name:'Pause Polar Frequency',exact:true}).click();await page.waitForFunction(()=>__contexts[0].state==='suspended');await settle(1);await frozen();ok('Pause suspends context and freezes sky')
 const downloads=requests.length;await play();assert.equal(requests.length,downloads);assert.equal(await page.evaluate(()=>__contexts.length),1);ok('Resume reuses decoded audio and one context')
 await page.setViewportSize({width:392,height:900});await page.waitForTimeout(200)
 const layout=await page.evaluate(()=>{const p=document.querySelector('.penguin-page');return {width:p.clientWidth,scroll:p.scrollWidth,cards:document.querySelectorAll('.p-clockcard').length}})
 assert.equal(layout.cards,4);assert.ok(layout.scroll<=layout.width+1);await page.screenshot({path:resolve(evidence,'mobile-lab3.jpg'),fullPage:true});ok('392px hero, controls and four cards remain inside page',layout)
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))});await page.waitForFunction(()=>__contexts[0].state==='suspended')
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))});assert.equal(await page.getByRole('button',{name:'Play Polar Frequency',exact:true}).count(),1);ok('Simulated hidden page pauses and never auto-resumes')
 await play();await page.getByRole('button',{name:'Replay arrival',exact:true}).click();await page.waitForFunction(()=>__contexts[0].state==='suspended');await page.getByRole('button',{name:'Skip intro',exact:true}).click();ok('Replay arrival stops the current music')
 await play();await page.getByRole('button',{name:'Switch demo profile',exact:true}).click();await page.waitForFunction(()=>__contexts[0].state==='closed');await page.getByRole('button',{name:'Skip intro',exact:true}).click();ok('Profile switch disposes the old context')
 await play();await page.evaluate(()=>__disposePlugin());await page.waitForFunction(()=>__contexts.every(c=>c.state==='closed')&&__labLoops.every(l=>l.disposed));ok('Plugin teardown disposes contexts and draw loops')
 await start();await page.route('**/api/plugins/penguin/audio-lab/music',r=>r.fulfill({status:503,body:'{}'}));await page.getByRole('button',{name:'Play Polar Frequency',exact:true}).click();await page.getByText('Music unavailable. The meeting planner still works.',{exact:true}).waitFor();assert.ok(await page.getByRole('button',{name:'Copy meeting proposal ↗'}).isEnabled());await page.unroute('**/api/plugins/penguin/audio-lab/music');await play();ok('Music outage keeps planner usable and Play can retry')
 assert.deepEqual(errors,[]);ok('No browser page errors')
}catch(e){out.push({status:'failed',error:e.stack});process.exitCode=1}
finally{await browser.close();await writeFile(resolve(evidence,'ui-checks.json'),JSON.stringify({scope:'Actual plugin and backend; controlled SDK host adapter; real Chrome WebAudio, not native Hermes or listening proof',checks:out},null,2));console.log(JSON.stringify(out,null,2))}
