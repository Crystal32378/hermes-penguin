import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {builder,root,buildDir,evidence} from './config.mjs'
const src=await readFile(resolve(root,'desktop/plugin.js'),'utf8')
const build=await builder()
await build({stdin:{contents:src+'\nexport { createPolarAudio };',resolveDir:resolve(root,'desktop'),sourcefile:'plugin.js',loader:'js'},platform:'node',format:'esm',outfile:resolve(buildDir,'model.mjs')})
const {polarAvailability,polarStep,featuresAt,polarIntensity,createPolarAudio}=await import(pathToFileURL(resolve(buildDir,'model.mjs')).href)
const features=JSON.parse(await readFile(resolve(root,'assets/audio-lab/polar-frequency.features.json')))
const results=[],ok=name=>results.push({name,status:'passed'})
const levels=[0,1,2,3,4].map(n=>polarAvailability(n,4))
assert.deepEqual(levels.map(s=>s.ratio),[0,.25,.5,.75,1]);assert.ok(levels.every((s,i)=>i===0||s.extent>levels[i-1].extent&&s.light>levels[i-1].light));ok('0/4 through 4/4 monotonically increases light and extent')
assert.deepEqual(polarAvailability(4,4,false),polarAvailability(0,0,false));assert.equal(polarAvailability(5,4).ratio,1);assert.equal(polarAvailability(-1,4).ratio,0);ok('Invalid and out-of-range availability is bounded')
for(const band of ['low','mid','high','onset']){assert.equal(features[band].length,3510);assert.ok(features[band].every(v=>Number.isFinite(v)&&v>=0&&v<=99))};ok('Bundled features have four complete finite 25fps bands')
for(const t of [-1,0,10,139.99,features.duration,features.duration+1])for(const [k,v]of Object.entries(featuresAt(features,t)))assert.ok(Number.isFinite(v),`${t} ${k}`)
assert.equal(featuresAt(features,0).low,featuresAt(features,features.duration).low);ok('Feature sampling is finite across duration wrap and negative offset')
let moving={};for(let n=0;n<80;n++)moving=polarStep(moving,featuresAt(features,n*.05),.05,true);assert.ok(moving.phase>0)
assert.equal(polarStep(moving,{low:1,mid:1,high:1,onset:1,beat:0},.05,false).phase,moving.phase);ok('Music advances phase; stopped or muted motion does not')
for(const s of levels)for(let i=0;i<100;i++){const val=polarIntensity(i/99,(i*13%100)/99,i,{...s,phase:0,low:0,mid:0});assert.ok(val.every(v=>Number.isFinite(v)&&v>=0&&v<=1))};ok('Painter intensity remains bounded across all availability levels')
const contexts=[]
class FakeContext {
 constructor(){this.currentTime=0;this.state='suspended';this.sources=[];contexts.push(this)}
 createGain(){return {gain:{value:0,setTargetAtTime(v){this.value=v}},connect(){},disconnect(){}}}
 async decodeAudioData(){return {duration:140}}
 async resume(){this.state='running'} async suspend(){this.state='suspended'} async close(){this.state='closed'}
 createBufferSource(){const s={connect(){},disconnect(){},stop(){this.stopped=true},start(at,offset){this.offset=offset}};this.sources.push(s);return s}
}
globalThis.AudioContext=FakeContext
const calls=[],api={rest:async path=>{calls.push(path);return path.endsWith('features')?features:{base64:'AA=='}}}
const a=createPolarAudio(api);assert.equal(contexts.length,0);assert.equal(calls.length,0);ok('No AudioContext or audio fetch before play gesture')
await Promise.all([a.play(),a.play()]);assert.equal(contexts.length,1);assert.equal(contexts[0].sources.length,1);assert.ok(contexts[0].sources[0].loop);assert.equal(a.snapshot().status,'playing');ok('Repeated play creates one looping source')
a.setStill(true);assert.equal(a.snapshot().status,'playing');assert.equal(contexts[0].state,'running');a.setStill(false);ok('Still sky does not pause the audio state machine')
a.toggleMute();assert.equal(a.audible(),false);assert.equal(a.features(),null);a.toggleMute();a.setVolume(0);assert.equal(a.audible(),false);a.setVolume(30);assert.ok(a.audible());ok('Mute and zero volume suppress motion features')
contexts[0].currentTime=17;a.pause();assert.equal(contexts[0].state,'suspended');assert.equal(a.snapshot().status,'paused');assert.ok(contexts[0].sources[0].stopped);await a.play();assert.equal(contexts[0].sources[1].offset,17);assert.equal(calls.length,2);ok('Pause suspends; resume keeps offset and reuses downloaded audio')
a.dispose();assert.equal(contexts[0].state,'closed');await a.play();assert.equal(contexts[0].sources.length,2);ok('Dispose closes context and later play is a no-op')
let resolveMusic;const b=createPolarAudio({rest:path=>path.endsWith('features')?Promise.resolve(features):new Promise(r=>resolveMusic=r)});const loading=b.play();b.pause();resolveMusic({base64:'AA=='});await loading;assert.equal(b.snapshot().status,'paused');assert.equal(contexts[1].sources.length,0);b.dispose();ok('Pause during pending audio load prevents late playback')
const c=createPolarAudio({rest:async()=>{throw Error('unavailable')}});await c.play();assert.equal(c.snapshot().status,'error');assert.match(c.snapshot().error,/planner still works/);assert.equal(contexts[2].state,'suspended');c.dispose();ok('Audio load failure leaves a recoverable planner-facing error')
const output={sourceSha256:createHash('sha256').update(src).digest('hex'),scope:'Pure model + controlled WebAudio mocks; not acoustic or browser playback proof',passed:results.length,results};await writeFile(resolve(evidence,'model-checks.json'),JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2))
