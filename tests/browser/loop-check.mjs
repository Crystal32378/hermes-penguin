// Real WebAudio, more than one complete track. No claim about human hearing.
import assert from 'node:assert/strict'
import {writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {dependency,url,evidence} from './config.mjs'
const {chromium}=await dependency('playwright')
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true})
const page=await browser.newPage({viewport:{width:1280,height:900}})
const errors=[];page.on('pageerror',e=>errors.push(e.message))
await page.addInitScript(()=>{
 const Native=AudioContext;window.__audio=[]
 window.AudioContext=class extends Native{
  constructor(...a){super(...a);this.sources=[];window.__audio.push(this)}
  createBufferSource(){const s=super.createBufferSource();this.sources.push(s);return s}
 }
})
let result={}
try{
 await page.goto(url);await page.getByRole('button',{name:'Skip intro',exact:true}).click()
 await page.getByRole('heading',{name:'4 of 4 can fit the full meeting'}).waitFor()
 await page.getByRole('button',{name:'Play Polar Frequency',exact:true}).click()
 await page.getByRole('button',{name:'Pause Polar Frequency',exact:true}).waitFor()
 const begin=await page.evaluate(()=>({t:__audio[0].currentTime,d:__audio[0].sources[0].buffer.duration}))
 const samples=[]
 for(let i=0;i<4;i++){
  await page.waitForTimeout(37000)
  const s=await page.evaluate(()=>({time:__audio[0].currentTime,contexts:__audio.length,sources:__audio[0].sources.length,state:__audio[0].state,loop:__audio[0].sources[0].loop,phase:+document.querySelector('.p-sky').dataset.phase,stats:__labLoops[0]}))
  samples.push(s);console.log(JSON.stringify({checkpoint:i+1,time:s.time,draws:s.stats.draws}))
 }
 const last=samples.at(-1);assert.ok(last.time-begin.t>begin.d);assert.equal(last.sources,1);assert.equal(last.contexts,1);assert.equal(last.state,'running');assert.equal(last.loop,true)
 assert.ok(samples.every((s,i)=>!i||s.phase>samples[i-1].phase));assert.deepEqual(errors,[])
 const avg=last.stats.totalMs/last.stats.draws
 // Rendering budget, not an absolute low-end device promise.
 assert.ok(last.stats.draws/148<22);assert.ok(avg<20)
 await page.getByRole('button',{name:'Pause Polar Frequency',exact:true}).click()
 await page.waitForTimeout(400);const n=await page.evaluate(()=>__labLoops[0].draws)
 await page.waitForTimeout(600);assert.equal(await page.evaluate(()=>__labLoops[0].draws),n)
 result={passed:true,scope:'Real Chrome WebAudio + actual SDK loop in controlled host adapter; no acoustic seam/native platform proof',duration:begin.d,elapsed:last.time-begin.t,averageDrawMs:avg,samples,checks:['One source loops beyond one track','Phase continues','20fps budget and mean draw <20ms on this Mac','Paused draw loop sleeps','No page errors']}
}catch(e){result={passed:false,error:e.stack};process.exitCode=1}
finally{await browser.close();await writeFile(resolve(evidence,'loop-check.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2))}
