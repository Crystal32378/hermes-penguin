import {builder,here,buildDir} from './config.mjs'
import {resolve} from 'node:path'
import {copyFile} from 'node:fs/promises'
const build=await builder()
await build({entryPoints:[resolve(here,'main.js')],outfile:resolve(buildDir,'bundle.js')})
await copyFile(resolve(here,'index.html'),resolve(buildDir,'index.html'))
console.log(`Built actual plugin into ${buildDir}`)
