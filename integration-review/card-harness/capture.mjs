import {dependency} from '../../tests/browser/config.mjs'
import {writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
const {chromium}=await dependency('playwright')
const browser=await chromium.launch({headless:true,channel:'chrome'})
try{
 const context=await browser.newContext({viewport:{width:1280,height:1000},reducedMotion:'reduce'})
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());return url.hostname==='127.0.0.1'?route.continue():route.abort()
 })
 const page=await context.newPage()
 await page.goto('http://127.0.0.1:8779')
 await page.getByRole('button',{name:'Skip intro',exact:true}).click()
 await page.getByRole('heading',{name:'4 of 4 can fit the full meeting'}).waitFor()
 await page.getByRole('button',{name:'Copy meeting proposal ↗'}).click()
 const card=page.getByRole('region',{name:'Meeting proposal completed'})
 await card.waitFor()
 await card.scrollIntoViewIfNeeded()
 await page.evaluate(()=>document.fonts.ready)
 await page.waitForFunction(()=>[...document.querySelectorAll('.p-sendoff img')].every(x=>x.complete&&x.naturalWidth>0))
 const png=await card.screenshot({path:'integration-review/existing-share-card-fixture.png',animations:'disabled'})
 const text=await page.evaluate(()=>window.fixtureCopiedProposal)
 assert.match(text,/Please confirm availability\. No calendar event has been created\./)
 await writeFile('integration-review/existing-share-card-fixture.txt',text+'\n')
 const meta={kind:'existing_penguin_sendoff_component',source:'desktop/plugin.js',fixture:true,real_native_hermes:false,clipboard:'synthetic in-memory only',time:'2026-11-16T21:00 Asia/Taipei',mime_type:'image/png',sha256:createHash('sha256').update(png).digest('hex'),bytes:png.length,caption:text}
 await writeFile('integration-review/existing-share-card-fixture.json',JSON.stringify(meta,null,2)+'\n')
 console.log(JSON.stringify(meta))
}finally{await browser.close()}
