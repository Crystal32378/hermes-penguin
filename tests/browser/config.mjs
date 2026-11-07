import {resolve,dirname} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {mkdir} from 'node:fs/promises'
export const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../..')
export const buildDir=resolve(process.env.PENGUIN_TEST_BUILD||resolve(root,'.test-build'))
export const evidence=resolve(process.env.PENGUIN_TEST_EVIDENCE||resolve(root,'.test-evidence'))
export const hermes=process.env.HERMES_SOURCE
export const deps=process.env.PENGUIN_NODE_MODULES||resolve(here,'node_modules')
export const url=process.env.PENGUIN_TEST_URL||'http://127.0.0.1:8773'
if(!/^http:\/\/127\.0\.0\.1:\d+\/?$/.test(url))throw Error('Use a loopback test harness')
export async function dependency(name){return import(pathToFileURL(name==='playwright'&&process.env.PLAYWRIGHT_MODULE?process.env.PLAYWRIGHT_MODULE:resolve(deps,name==='esbuild'?'esbuild/lib/main.js':`${name}/index.mjs`)).href)}
export async function builder(){
 if(!hermes)throw Error('HERMES_SOURCE must point to the official Hermes checkout')
 await mkdir(buildDir,{recursive:true});await mkdir(evidence,{recursive:true})
 const {build}=await dependency('esbuild')
 return options=>build({...options,bundle:true,alias:{react:resolve(deps,'react'),'react-dom':resolve(deps,'react-dom'),'@hermes/plugin-sdk':resolve(here,'sdk.js'),'@penguin/budgeted-loop':resolve(hermes,'apps/desktop/src/lib/budgeted-loop.ts'),'@/lib/renderer-loop-pause':resolve(here,'pause.js')},define:{'process.env.NODE_ENV':'"development"'}})
}
