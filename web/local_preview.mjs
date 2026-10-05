// Browser-local images, keyed by LoRA filename; never serialized into workflows.
export function validatePreview(file){
 if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Choose a PNG, JPEG or WebP image.');
 if(file.size>5*1024*1024)throw Error('Image must be 5 MB or smaller.');
}
export function defaultPreview(images,allowMature=false){
 return (images||[]).find(i=>i&&(!i.mature||allowMature)&&/^https:\/\/image\.civitai\.com\//.test(i.url));
}
export async function fetchPreview(url){
 if(!/^https:\/\/image\.civitai\.com\//.test(url))throw Error('Untrusted preview image host.');
 const response=await fetch(url,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Could not download Civitai preview.');
 const type=(response.headers.get('content-type')||'').split(';')[0].trim();
 validatePreview({type,size:Number(response.headers.get('content-length'))||0});
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>5*1024*1024)throw Error('Image must be 5 MB or smaller.');chunks.push(value);}}catch(error){await reader.cancel();throw error;}finally{reader.releaseLock();}
 return new Blob(chunks,{type});
}
async function store(mode,name,value){
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('luci.lora.previews.v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('images');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 try{return await new Promise((resolve,reject)=>{const tx=db.transaction('images',mode==='get'?'readonly':'readwrite'),s=tx.objectStore('images');const r=mode==='get'?s.get(name):mode==='put'?s.put(value,name):s.delete(name);tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Image storage failed'));});}finally{db.close();}
}
export function localPreview(panel,name){
 const section=document.createElement('section'),title=document.createElement('h4'),image=document.createElement('img'),input=document.createElement('input'),remove=document.createElement('button'),status=document.createElement('p');
 title.textContent='Preview';section.className='luci-local-preview';image.alt='LoRA preview';image.hidden=true;
 input.type='file';input.accept='image/png,image/jpeg,image/webp';input.setAttribute('aria-label','Add LoRA preview image');input.disabled=!name;
 remove.type='button';remove.textContent='Remove image';remove.hidden=true;status.className='luci-muted';status.textContent=name?'PNG, JPEG or WebP · up to 5 MB. Saved only in this browser, not uploaded or included in workflows.':'Choose a LoRA before adding an image.';
 let url=null,revision=0;
 const show=blob=>{if(url)URL.revokeObjectURL(url);url=blob?URL.createObjectURL(blob):null;image.hidden=!blob;remove.hidden=!blob;if(url)image.src=url;else image.removeAttribute('src');};
 // Revoke after decoding: the displayed image remains, without retaining URLs.
 image.onload=()=>{if(url){URL.revokeObjectURL(url);url=null;}};
 input.onchange=async()=>{const file=input.files?.[0];if(!file)return;revision++;input.disabled=true;try{validatePreview(file);await store('put',name,file);show(file);status.textContent='Preview saved in this browser.';}catch(e){status.textContent=e.message||'Could not save image.';}finally{input.value='';input.disabled=false;}};
 remove.onclick=async()=>{revision++;try{await store('delete',name);show(null);status.textContent='Preview removed.';}catch(e){status.textContent=e.message||'Could not remove image.';}};
 section.append(title,image,input,remove,status);panel.append(section);
 const ready=name?store('get',name).then(blob=>{if(section.isConnected&&revision===0)show(blob);}):Promise.resolve();
 ready.catch(()=>{status.textContent='Browser image storage is unavailable.';});
 return {async saveDefault(images,allowMature=false){const start=revision;try{await ready;if(!name||await store('get',name))return;const sample=defaultPreview(images,allowMature);if(!sample)return;status.textContent='Saving default Civitai preview…';const blob=await fetchPreview(sample.url);if(revision!==start||await store('get',name))return;await store('put',name,blob);if(section.isConnected)show(blob);status.textContent='Default Civitai preview saved in this browser. You can replace it with your own image.';}catch(error){if(revision===start)status.textContent='Automatic preview could not be saved. You can add your own image. '+(error.message||'');}}};
}
