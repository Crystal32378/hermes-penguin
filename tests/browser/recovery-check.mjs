import {readFile,writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {dependency,url,evidence,root} from './config.mjs'
const {chromium}=await dependency('playwright')
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true})
let result
try{
 const page=await browser.newPage();await page.goto(url)
 // Execute the existing local regression function unchanged.
 const run=Function('return ('+await readFile(resolve(root,'tests/desktop-recovery.js'),'utf8')+')')()
 result=await run(page)
}catch(e){result={error:e.stack};process.exitCode=1}
finally{await browser.close();await writeFile(resolve(evidence,'recovery-checks.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2))}
