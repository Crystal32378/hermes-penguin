import React from 'react'
import {createRoot} from 'react-dom/client'
import penguin from '../../desktop/plugin.js'
import {changeProfile, host} from './sdk.js'
let page
const disposers=[]
penguin.register({
  onDispose:fn=>disposers.push(fn),
  registerMany:items=>{page=items.find(i=>i.id==='page')},
  rest:async(path,opts)=>{
    const response=await fetch('/api/plugins/penguin'+path,{method:opts.method,headers:{'Content-Type':'application/json','X-Demo-Profile':host.state.profile.get()},body:JSON.stringify(opts.body)})
    if(!response.ok)throw Error('backend')
    return response.json()
  },
  os:{writeClipboard:async text=>{await navigator.clipboard.writeText(text);return true}}
})
const root=createRoot(document.getElementById('app'))
window.__disposePlugin=()=>{root.unmount();disposers.forEach(fn=>fn())}
root.render(React.createElement(React.Fragment,{},
  React.createElement('aside',{style:{font:'12px system-ui',padding:'8px 16px',background:'#173a43',color:'white'}},'PRIVATE PENGUIN TEST HARNESS · ',React.createElement('button',{onClick:changeProfile},'Switch demo profile')),
  page.render()))
