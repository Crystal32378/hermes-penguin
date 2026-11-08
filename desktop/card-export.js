// Local-only export of the existing rendered SendOff component, not a redrawn card.
// The real PNG/visual result must be verified in a permitted browser before shipping.
export function checkExportSize(width,height){
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1||width>2048||height>4096||width*height>6000000)throw Error('Card is too large to export safely. Use the text proposal or fewer people.')
}
export function assertLocalImage(src){
  if(!/^data:image\/(png|webp);base64,[A-Za-z0-9+/=]+$/.test(src))throw Error('Card artwork is not a bundled image. Export stopped without fetching it.')
}
export async function exportExistingCard(node,{selectionKey,isCurrent}){
  if(!node?.isConnected||!node.classList.contains('p-sendoff'))throw Error('The existing share card is not ready.')
  if(!isCurrent(selectionKey))throw Error('Selected time changed. Review the new card first.')
  if(!node.classList.contains('p-export-card')||node.dataset.exportReady!=='true')throw Error('Bundled card artwork is still loading. Wait for the picture and stamp, then try again.')
  await document.fonts.ready
  for(const img of node.querySelectorAll('img')){
    assertLocalImage(img.currentSrc||img.src)
    await img.decode()
  }
  if(!isCurrent(selectionKey))throw Error('Selected time changed. Review the new card first.')
  const box=node.getBoundingClientRect(),width=Math.ceil(box.width),height=Math.ceil(box.height)
  checkExportSize(width,height)
  const clone=node.cloneNode(true),original=[node,...node.querySelectorAll('*')],copies=[clone,...clone.querySelectorAll('*')]
  for(let i=0;i<original.length;i++){
    const src=original[i],dst=copies[i],computed=getComputedStyle(src)
    for(const attr of [...dst.attributes])if(/^on/i.test(attr.name)||['id','contenteditable','tabindex'].includes(attr.name))dst.removeAttribute(attr.name)
    for(const property of computed){
      const value=computed.getPropertyValue(property)
      if(/url\(/i.test(value)&&!/^url\(["']?data:image\/(png|webp);base64,[A-Za-z0-9+/=]+["']?\)$/i.test(value))throw Error('Export stopped: unsupported image reference in card styles.')
      dst.style.setProperty(property,value)
    }
    dst.style.animation='none';dst.style.transition='none';dst.style.caretColor='transparent'
  }
  for(const el of clone.querySelectorAll('script,style,link,iframe,object,embed,button,input,textarea,select,audio,video,canvas'))el.remove()
  clone.style.margin='0';clone.style.width=`${width}px`;clone.style.height=`${height}px`;clone.style.transform='none'
  clone.setAttribute('xmlns','http://www.w3.org/1999/xhtml')
  const serialized=new XMLSerializer().serializeToString(clone)
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject x="0" y="0" width="100%" height="100%">${serialized}</foreignObject></svg>`
  const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)
  await image.decode()
  if(!isCurrent(selectionKey))throw Error('Selected time changed. Review the new card first.')
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height
  const context=canvas.getContext('2d');if(!context)throw Error('PNG export is not available in this renderer.')
  context.drawImage(image,0,0)
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('PNG export failed. Nothing was saved or sent.')),'image/png'))
  if(blob.size>8*1024*1024)throw Error('PNG exceeds this prototype’s 8 MiB limit.')
  const sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join('')
  if(!isCurrent(selectionKey))throw Error('Selected time changed. Review the new card first.')
  return {blob,sha256,bytes:blob.size,width,height,selectionKey,source:'existing SendOff',visuallyVerified:false}
}
