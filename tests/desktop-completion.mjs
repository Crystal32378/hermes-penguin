// Development-only browser regression. Requires Playwright and a disposable
// loopback harness serving this checkout's actual Desktop component/backend.
// No native Hermes claim: the harness supplies a test SDK adapter.
import assert from 'node:assert/strict'
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const url=process.env.PENGUIN_TEST_URL || 'http://127.0.0.1:8768'
assert.match(url,/^http:\/\/127\.0\.0\.1:\d+\/?$/)
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL})
const page=await browser.newPage({viewport:{width:1280,height:900}})
const passed=[]
try {
  // Isolated test page only: exercise both clipboard outcomes without changing
  // the user's clipboard or requesting clipboard permissions.
  await page.addInitScript(()=>{
    window.penguinCopyFails=false
    Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{
      if(window.penguinCopyFails)throw Error('test clipboard unavailable')
    }}})
  })
  await page.goto(url)
  await page.getByRole('button',{name:'Enter planner · 略過開場'}).click()
  await page.getByRole('heading',{name:'4 of 4 can fit the full meeting'}).waitFor()
  assert.deepEqual(await page.locator('.p-clockcard .p-time').allTextContents(),['21:00','08:00','13:00','05:00'])
  for(const name of ['Mika','Rowan','Ivo','Nora'])await page.getByRole('button',{name:`Salute ${name}`}).click()
  assert.equal(await page.locator('.p-commend').count(),4)
  passed.push('four dated clocks and all SALUTE controls')
  const copy=page.getByRole('button',{name:'Copy meeting proposal ↗'})
  await copy.click()
  const cue=page.locator('.p-summary [role=status]')
  await cue.waitFor()
  assert.match(await cue.textContent(),/Proposal copied\. No calendar event created/)
  const bounds=await cue.boundingBox()
  assert.ok(bounds.y>=0 && bounds.y+bounds.height<=900,'completion cue must be visible near Copy')
  await page.getByRole('button',{name:'View send-off ↓'}).click()
  const sendoff=page.getByRole('region',{name:'Meeting proposal completed'})
  const target=await sendoff.boundingBox()
  assert.ok(target.y>=0&&target.y+target.height<=900,'explicit navigation reveals the complete send-off')
  passed.push('visible completion cue and explicit send-off navigation')
  await page.setViewportSize({width:392,height:900})
  const dates=await page.locator('.p-final-date').evaluateAll(nodes=>nodes.map(n=>{
    const r=document.createRange();r.selectNodeContents(n)
    return {date:n.textContent,lines:r.getClientRects().length,width:n.getBoundingClientRect().width,parent:n.parentElement.getBoundingClientRect().width}
  }))
  assert.equal(dates.length,4)
  assert.ok(dates.every(d=>d.date==='2026-11-16'&&d.lines===1&&d.width<=d.parent))
  passed.push('392px completion dates stay intact')
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.getByRole('button',{name:'Replay the commander’s exit'}).click()
  assert.equal(await page.locator('.p-walker').evaluate(n=>getComputedStyle(n).animationName),'none')
  passed.push('reduced-motion exit remains static')
  await page.getByRole('button',{name:'Close send-off'}).click()
  await page.evaluate(()=>{window.penguinCopyFails=true})
  await copy.click()
  await page.getByLabel('Meeting proposal to copy').waitFor()
  assert.equal(await sendoff.count(),0)
  assert.equal(await cue.count(),0)
  passed.push('clipboard failure offers manual proposal without APPROVED')
  const time=page.getByRole('textbox',{name:'Selected reference time'})
  await time.fill('not-a-time')
  await page.locator('.p-clockcard .p-badge').filter({hasText:'NO VALID TIME'}).first().waitFor()
  assert.ok(await copy.isDisabled())
  await time.fill('21:00')
  await page.getByRole('heading',{name:'4 of 4 can fit the full meeting'}).waitFor()
  passed.push('invalid time disables copying and recovers')
  console.log(JSON.stringify({passed,scope:'production component in disposable browser harness'},null,2))
}finally{await browser.close()}
