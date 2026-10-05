// Remote metadata is always rendered as text, never HTML or executable markup.
export function modelDetails(container,data,options={}){
 const make=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 const copy=(text)=>{const b=make('button','Copy');b.type='button';b.onclick=async()=>{try{await navigator.clipboard.writeText(text);b.textContent='Copied';}catch{b.textContent='Select text to copy';}};return b;};
 container.replaceChildren();const table=make('dl');table.className='luci-model-info';
 for(const [label,value] of [['File',data.filename],['SHA-256',data.hash],['Model',data.modelName],['Version',data.name],['Type',data.type],['Base model',data.family],['Trained words',(data.words||[]).join(', ')]]){table.append(make('dt',label));const dd=make('dd',value||'Not provided');if(label==='SHA-256'&&value)dd.append(copy(value));table.append(dd);}
 if(data.url&&/^https:\/\/civitai\.com\/models\/\d+\?modelVersionId=\d+$/.test(data.url)){table.append(make('dt','Civitai'));const dd=make('dd'),a=make('a','View model on Civitai');a.href=data.url;a.target='_blank';a.rel='noopener noreferrer';dd.append(a);table.append(dd);}container.append(table);
 const notesLabel=make('label','Personal notes'),notes=make('textarea');notes.placeholder='Add your notes…';const notesKey='luci.lora.notes.v1:'+data.filename;try{notes.value=localStorage.getItem(notesKey)||'';}catch{}notes.onchange=()=>{try{localStorage.setItem(notesKey,notes.value);}catch{notes.setAttribute('aria-label','Notes could not be saved in browser storage');}};notesLabel.append(notes);container.append(notesLabel);
 if(options.showPreviews===false)return;
 container.append(make('h4','Sample images'),make('p','Available generation metadata only. These settings are never applied to your workflow.'));
 const gallery=make('div');gallery.className='luci-sample-gallery';
 const images=(data.images||[]).filter(i=>options.allowMature||!i.mature).slice(0,12);
 for(const [index,item] of images.entries()){
  if(!/^https:\/\/image\.civitai\.com\//.test(item.url))continue;
  const card=make('article'),img=make('img');img.src=item.url;img.alt='Civitai sample '+(index+1);img.loading='lazy';img.referrerPolicy='no-referrer';img.onerror=()=>img.replaceWith(make('p','Preview unavailable'));
  const details=make('details'),summary=make('summary','Show generation settings');details.append(summary);const fields=make('dl'),meta=item.meta||{};
  for(const [label,value] of [['Seed',meta.seed],['Steps',meta.steps],['CFG',meta.cfgScale],['Sampler',meta.sampler],['Scheduler',meta.scheduler],['Model',meta.Model||meta.model],['Dimensions',item.width&&item.height?item.width+' × '+item.height:null]])fields.append(make('dt',label),make('dd',value||'Not provided'));
  details.append(fields);for(const [label,value] of [['Positive prompt',meta.prompt],['Negative prompt',meta.negativePrompt]]){details.append(make('h5',label));const p=make('p',value||'Not provided');p.className='luci-sample-prompt';details.append(p);if(value)details.append(copy(value));}card.append(img,details);gallery.append(card);
 }container.append(gallery);if(!images.length){const count=(data.images||[]).length;container.append(make('p',count?`${count} sample image(s) returned, hidden by the mature/unknown-rating filter. Enable “Allow mature-rated previews” in node settings if you want to view them.`:'Civitai returned no supported sample images for this version.'));}
}
