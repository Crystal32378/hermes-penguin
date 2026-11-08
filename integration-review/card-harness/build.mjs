import {createRequire} from 'node:module'
import {resolve} from 'node:path'
const require=createRequire(import.meta.url)
const esbuild=require('../../../ui-harness/node_modules/esbuild')
const deps=resolve('../../../ui-harness/node_modules')
await esbuild.build({entryPoints:['main.js'],bundle:true,outfile:'bundle.js',format:'esm',nodePaths:[deps],alias:{'@hermes/plugin-sdk':resolve('sdk.js'),'@penguin/budgeted-loop':resolve('../../../reference/hermes-agent/apps/desktop/src/lib/budgeted-loop.ts'),'@/lib/renderer-loop-pause':resolve('pause.js')},define:{'process.env.NODE_ENV':'"development"'}})
