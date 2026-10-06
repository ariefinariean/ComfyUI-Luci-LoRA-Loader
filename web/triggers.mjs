const key=w=>w.trim().toLowerCase();
export function mergeCreator(row,words,verified=false){
 row.creatorWords=[...new Set([...(row.creatorWords||[]),...words.filter(w=>typeof w==='string'&&w.trim()).map(w=>w.trim())])];
 const protectedKeys=new Set(row.creatorWords.map(key));row.customWords=(row.customWords||[]).filter(w=>!protectedKeys.has(key(w)));
 if(verified){const customKeys=new Set(row.customWords.map(key));for(const w of row.words||[])if(!protectedKeys.has(key(w))&&!customKeys.has(key(w))){row.customWords.push(w);customKeys.add(key(w));}row.triggerOriginsKnown=true;}
 row.words=[...new Set([...(row.words||[]),...row.creatorWords])];
}
export function addCustom(row,lines){
 row.customWords??=[];const known=new Set((row.words||[]).map(key));let added=0;
 for(const line of lines){const word=line.trim();if(!word||known.has(key(word)))continue;known.add(key(word));row.customWords.push(word);row.words.push(word);row.selected.push(word);added++;}return added;
}
export function deleteCustom(row,word){
 if((row.creatorWords||[]).some(w=>key(w)===key(word))||!(row.customWords||[]).includes(word))return false;
 row.customWords=row.customWords.filter(w=>w!==word);row.words=row.words.filter(w=>w!==word);row.selected=row.selected.filter(w=>w!==word);return true;
}
export function triggerSection(section,row,save,separator=', '){
 const make=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 const btn=(text,action)=>{const b=make('button',text);b.type='button';b.onclick=action;return b;};
 const render=()=>{section.replaceChildren(make('h4','Trigger words'),make('p','Selected words from enabled, available LoRAs reach the triggers output.'));const tools=make('div');tools.className='luci-tools';
 tools.append(btn('All',()=>{row.selected=[...row.words];save();render();}),btn('None',()=>{row.selected=[];save();render();}));
 const status=make('p');status.className='luci-muted';status.setAttribute('role','status');
 const bulk=make('div');bulk.className='luci-trigger-bulk';bulk.hidden=true;const text=make('textarea');text.placeholder='One trigger word or phrase per line';text.setAttribute('aria-label','Bulk trigger words');bulk.append(make('p','One non-empty line = one trigger. Phrases stay together; duplicates are ignored.'),text,btn('Add triggers',()=>{const n=addCustom(row,text.value.split(/\r?\n/));save();render();status.textContent=n+' triggers added.';}));
 const copy=btn('Copy selected',async()=>{try{await navigator.clipboard.writeText(row.words.filter(w=>row.selected.includes(w)).join(separator));status.textContent='Selected triggers copied.';}catch{status.textContent='Clipboard unavailable.';}});copy.className='luci-trigger-copy';const icon=make('img');icon.src=new URL('./copy.svg',import.meta.url).href;icon.alt='';icon.setAttribute('aria-hidden','true');copy.prepend(icon);
 tools.append(btn('Bulk add',()=>{bulk.hidden=!bulk.hidden;if(!bulk.hidden)text.focus();}),copy);section.append(tools);
 const custom=new Set(row.customWords||[]);for(const [label,words] of [['Creator / protected triggers',row.words.filter(w=>!custom.has(w))],['Your triggers',row.words.filter(w=>custom.has(w))]]){section.append(make('p',label));const chips=make('div');chips.className='luci-chips';for(const word of words){const tag=make('span');tag.className='luci-trigger-tag'+(row.selected.includes(word)?' chosen':'');const toggle=btn(word,()=>{row.selected=row.selected.includes(word)?row.selected.filter(w=>w!==word):[...row.selected,word];save();render();});toggle.setAttribute('aria-pressed',row.selected.includes(word));tag.append(toggle);if(custom.has(word)){const del=btn('×',()=>{deleteCustom(row,word);save();render();});del.setAttribute('aria-label','Delete custom trigger '+word);tag.append(del);}chips.append(tag);}section.append(chips);}
 const form=make('form');form.className='luci-form';const input=make('input');input.placeholder='Add your own trigger word…';input.setAttribute('aria-label','Custom trigger word');const add=make('button','Add');form.append(input,add);form.onsubmit=e=>{e.preventDefault();addCustom(row,[input.value]);save();render();};section.append(form,bulk,status);
 if(!row.triggerOriginsKnown&&row.words.some(w=>!(row.creatorWords||[]).includes(w)&&!custom.has(w)))section.append(make('p','Older saved words stay protected until a successful Civitai lookup identifies their source.'));
 };render();return render;
}
