// Test-only SDK adapter. The production plugin imports Hermes' real SDK.
import { useSyncExternalStore } from 'react'
let epoch=0, profile='demo', listeners=new Set()
export const ROUTES_AREA='routes', SIDEBAR_NAV_AREA='sidebar.nav'
export const host={state:{profile:{get:()=>profile,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn)}}}}
export const useValue=atom=>useSyncExternalStore(atom.subscribe,atom.get)
export const gatewayActivationEpoch=()=>epoch
export function changeProfile(){profile=profile==='demo'?'second-demo':'demo';epoch++;listeners.forEach(fn=>fn())}

import {createBudgetedLoop as officialLoop} from '@penguin/budgeted-loop'
// Real public SDK loop; only the host visibility adapter is replaced.
export function createBudgetedLoop(draw,options){
  const stats={draws:0,totalMs:0,maxMs:0,disposed:false};(window.__labLoops??=[]).push(stats)
  const loop=officialLoop(now=>{const start=performance.now();draw(now);const ms=performance.now()-start;stats.draws++;stats.totalMs+=ms;stats.maxMs=Math.max(stats.maxMs,ms)},options)
  return {...loop,dispose:()=>{loop.dispose();stats.disposed=true}}
}
