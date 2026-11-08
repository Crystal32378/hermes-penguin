import React from 'react'
import {createRoot} from 'react-dom/client'
import penguin from '../../desktop/plugin.js'
let page
penguin.register({onDispose:()=>{},registerMany:items=>{page=items.find(i=>i.id==='page')},rest:async(path,opts={})=>{
  const response=await fetch('/api/plugins/penguin'+path,{method:opts.method||'GET',headers:{'Content-Type':'application/json'},body:opts.body?JSON.stringify(opts.body):undefined})
  if(!response.ok)throw Error('backend');return response.json()
},os:{writeClipboard:async text=>{window.fixtureCopiedProposal=text;return true}}})
createRoot(document.getElementById('app')).render(page.render())
