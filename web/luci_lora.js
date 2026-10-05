import {app} from '../../scripts/app.js';
import {api} from '../../scripts/api.js';
import {readState,makeRow,moveRow} from './state.mjs';
import {folderEntries} from './folders.mjs';
import {localPreview} from './local_preview.mjs';
import {modelDetails} from './model_details.mjs';
import {detailsLayout} from './details_layout.mjs';

const CLASS='LuciLoRALoader', PRESETS='luci.lora.stacks.v1', DEFAULTS='luci.lora.defaults.v1';
const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./luci_lora.css',import.meta.url).href;document.head.append(css);
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const button=(text,action,label)=>{const b=el('button','',text);b.type='button';if(label)b.setAttribute('aria-label',label);b.onclick=action;return b;};
function presets(){try{return JSON.parse(localStorage.getItem(PRESETS)||'{}');}catch{return {};}}
function defaults(){try{return JSON.parse(localStorage.getItem(DEFAULTS)||'{}');}catch{return {};}}
function install(node){
 const value=node.widgets?.find(w=>w.name==='stack');if(!value)return;
 value.type='hidden';value.hidden=true;value.draw=()=>{};
 value.computeSize=()=>[0,-4];value.computeLayoutSize=()=>({minHeight:0,maxHeight:0,minWidth:0});
 let storageOptions={...value.options,hidden:true};
 Object.defineProperty(value,'options',{configurable:true,enumerable:true,get:()=>storageOptions,set:next=>{storageOptions={...next,hidden:true};}});
 // Hide the backing STRING editor's hit area, not just its visual contents.
 for(const element of new Set([value.element,value.inputEl].filter(Boolean))){
  element.style.display='none';element.style.pointerEvents='none';
  element.style.height='0px';element.style.minHeight='0px';element.style.maxHeight='0px';
  element.classList?.add('luci-lora-storage');
 }
 const root=el('div','luci-lora');let state={...defaults(),...readState(value.value)},files=null,active=null,dialog=null,last=value.value,removed=false;
 value.getMinHeight=()=>0;value.getMaxHeight=()=>0;
 const contentHeight=()=>56+state.rows.length*80+(node._luciStatus?20:0);
 const widget=node.addDOMWidget('luci_rows','luci_rows',root,{serialize:false,hideOnZoom:false,getMinHeight:contentHeight,getMaxHeight:contentHeight});
 widget.serialize=false;
 // Never derive a sizing floor from the current node width or row count.
 widget.computeLayoutSize=()=>({minHeight:contentHeight(),minWidth:380,maxHeight:contentHeight()});
 widget.computeSize=()=>[380,contentHeight()];
 widget.getMinHeight=contentHeight;widget.getMaxHeight=contentHeight;
 function markWidgetHosts(){
  // The renderer owns these wrappers. Mark only the nearest widget host,
  // never a node/canvas container or another extension's widgets.
  root.closest?.('.dom-widget')?.classList.add('luci-lora-host');
  for(const element of [value.element,value.inputEl]){
   element?.closest?.('.dom-widget')?.classList.add('luci-lora-storage-host');
  }
 }
 queueMicrotask(markWidgetHosts);
 // Keep native widget coordinates. Only the bordered toolbar reaches into
 // the socket band; its narrow center box leaves both edges unobstructed.
 node.color='#202020';node.bgcolor='#282828';node.size[0]=380;
 node.size[1]=contentHeight()+90;
 function iconButton(symbol,action,label){const b=button(symbol,action,label);b.className='luci-icon';b.title=label;return b;}
 function settings(){const panel=modal('LoRA settings');panel.append(number('Default strength (new LoRAs)',state.defaultStrength??1,n=>{state.defaultStrength=n??1;save();}),number('Strength step (arrows)',state.step??.05,n=>{state.step=n||.05;save();},.001,1));const separator=el('label','luci-setting');separator.append(el('span','','Trigger words separator'));const input=el('input');input.value=state.separator??', ';input.onchange=()=>{state.separator=input.value;save();};separator.append(input);panel.append(separator);const cache=el('label','luci-setting');cache.append(el('span','','LoRA memory use'));const select=el('select');for(const [v,t] of [['last','Standard — last LoRA'],['none','Lowest — no cache'],['bounded','Fast — up to 4 LoRAs']]){const o=el('option','',t);o.value=v;select.append(o);}select.value=state.cache||'last';select.onchange=()=>{state.cache=select.value;save();};cache.append(select);panel.append(cache);const extension=el('label','luci-setting');extension.append(el('span','','Hide file extension'));const check=el('input');check.type='checkbox';check.checked=!!state.hideExtension;check.onchange=()=>{state.hideExtension=check.checked;save();};extension.append(check);panel.append(extension,el('p','luci-muted','MODEL and CLIP strengths are always separate. Missing files warn and skip. Civitai lookup is optional and runs only when clicked.'));onlineSettings(panel);panel.append(button('Saved LoRA stacks',savedStacks));panel.append(button('Set as default for new Luci LoRA nodes',()=>{try{localStorage.setItem(DEFAULTS,JSON.stringify({defaultStrength:state.defaultStrength??1,step:state.step??.05,separator:state.separator??", ",hideExtension:!!state.hideExtension,cache:state.cache||"last",showLookup:state.showLookup!==false,showPreviews:state.showPreviews!==false,allowMature:!!state.allowMature}));close();}catch{panel.append(el('p','luci-danger','Browser storage unavailable'));}}));}
 function onlineSettings(panel){
  for(const [key,label,fallback] of [['showLookup','Show Civitai lookup button',true],['showPreviews','Show preview thumbnails',true],['allowMature','Allow mature-rated previews',false]]){const wrap=el('label','luci-setting');const input=el('input');input.type='checkbox';input.checked=state[key]??fallback;input.onchange=()=>{state[key]=input.checked;save();};wrap.append(el('span','',label),input);panel.append(wrap);}
  panel.append(el('h4','','Civitai account (optional)'),el('p','luci-muted','Anonymous by default. Saved keys stay in this browser, never in workflows or presets. Browser storage is not encrypted; other extensions on this origin may access it.'));
  const field=el('input');field.type='password';field.autocomplete='off';field.placeholder=apiKey()?'A key is saved - enter to replace':'Optional Civitai API key';field.setAttribute('aria-label','Civitai API key');panel.append(field);
  panel.append(button('Save key locally',()=>{if(!field.value.trim())return;try{localStorage.setItem('luci.civitai.key.v1',field.value.trim());field.value='';field.placeholder='Key saved locally';}catch{field.placeholder='Browser storage unavailable';}}),button('Remove saved key',()=>{try{localStorage.removeItem('luci.civitai.key.v1');field.value='';field.placeholder='Anonymous lookup';}catch{field.placeholder='Could not remove saved key';}}));
 }
 function apiKey(){try{return localStorage.getItem('luci.civitai.key.v1')||'';}catch{return '';}}
 function onlineDetails(panel,row,drawChips){
  const layout=detailsLayout(panel,row);
  const preview=localPreview(layout.preview,row.name);
  if(state.showLookup===false)return;
  const section=el('section');section.append(el('h4','','Civitai metadata'),el('p','luci-muted','Lookup sends the SHA-256 hash to Civitai, not the file. Previews load from Civitai only after you request a lookup.'));
  const status=el('p','luci-muted'),gallery=el('div','luci-preview');const lookup=button('Look up on Civitai',async()=>{
   lookup.disabled=true;status.textContent='Hashing file and looking up metadata...';gallery.replaceChildren();
   try{
    const response=await api.fetchApi('/luci/lora/civitai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:row.name,key:apiKey()})});const data=await response.json();if(!response.ok)throw Error(data.error||'Lookup failed');if(removed||dialog?.firstChild!==panel)return;
    row.words=[...new Set([...row.words,...(data.words||[])])];save();drawChips();status.textContent=(data.family||'Unknown family')+' - '+(data.words||[]).length+' trigger word(s) found. Select chips to include them.';
    modelDetails(gallery,data,{showPreviews:state.showPreviews,allowMature:state.allowMature});
    layout.update(gallery,data);layout.samples.prepend(status);lookup.textContent='Refresh Civitai info';
    if(state.showPreviews!==false)await preview.saveDefault(data.images,state.allowMature===true);
   }catch(error){if(dialog?.firstChild===panel)status.textContent=error.message||'Lookup unavailable. Local metadata still works.';}finally{lookup.disabled=false;}
  });lookup.disabled=!row.name;lookup.className='luci-detail-lookup';layout.actions.prepend(lookup);layout.samples.append(status,gallery);
 }
 function close(){dialog?.remove();dialog=null;}
 function fitHeight(){node.setSize([Math.max(380,node.size[0]),Math.max(contentHeight()+90,node.computeSize()[1])]);}
 function save(structural=false){value.value=JSON.stringify(state);last=value.value;node.setDirtyCanvas(true,true);render();if(structural)fitHeight();}
 function modal(title){close();const backdrop=el('div','luci-modal');const panel=el('div','luci-dialog');const header=el('header');header.append(el('h3','',title),button('Close',close));panel.append(header);backdrop.append(panel);document.body.append(backdrop);backdrop.onclick=e=>{if(e.target===backdrop)close();};backdrop.onkeydown=e=>{if(e.key==='Escape')close();};dialog=backdrop;return panel;}
 function number(label,v,change,min=-10,max=10){const wrap=el('label','luci-number');wrap.append(el('span','',label));const input=el('input');input.type='number';input.step=String(state.step||.05);input.min=min;input.max=max;input.value=v??'';input.setAttribute('aria-label',label);input.onchange=()=>{const n=input.value===''?null:Number(input.value);if(n!==null&&(!Number.isFinite(n)||n<min||n>max)){input.value=v??'';return;}change(n);};wrap.append(input);return wrap;}

 function strength(label,v,change){
  const wrap=el('div','luci-strength'),input=el('input');
  input.type='number';input.step=String(state.step||.05);input.min=-10;input.max=10;input.value=v;input.setAttribute('aria-label',label+' strength');
  const commit=()=>{const n=Number(input.value);if(input.value===''||!Number.isFinite(n)||n< -10||n>10){input.value=v;return;}change(n);};
  input.onchange=commit;
  const arrows=el('div','luci-stepper');
  for(const [symbol,direction] of [['▴',1],['▾',-1]]){
   const b=button(symbol,()=>{const current=Number(input.value);const next=Math.max(-10,Math.min(10,Number(((Number.isFinite(current)?current:v)+direction*(state.step||.05)).toFixed(6))));input.value=next;change(next);},(direction>0?'Increase ':'Decrease ')+label+' strength');
   arrows.append(b);
  }
  wrap.append(input,arrows);return wrap;
 }
 async function refresh(){try{const response=await api.fetchApi('/luci/lora/list');if(!response.ok)throw Error('Could not refresh LoRA list');files=(await response.json()).files;render();}catch(err){files=null;console.warn('[Luci LoRA Loader]',err);}}
 async function picker(row){if(!files)await refresh();const panel=modal('Choose a LoRA');panel.classList.add('luci-file-browser');const search=el('input');search.placeholder='Search all folders…';search.setAttribute('aria-label','Search LoRAs');let folder='';const breadcrumbs=el('div','luci-breadcrumbs');const list=el('div','luci-picker');panel.append(search,breadcrumbs,list);const populate=()=>{list.replaceChildren();breadcrumbs.replaceChildren();breadcrumbs.append(button('All',()=>{folder='';search.value='';populate();}));if(folder){breadcrumbs.append(button('Up',()=>{folder=folder.split('/').slice(0,-1).join('/');search.value='';populate();}),el('span','luci-muted',folder));}const entries=folderEntries(files||[],folder,search.value);for(const group of entries.folders){const b=button('',()=>{folder=group.path;populate();});b.className='luci-folder';b.append(el('span','luci-folder-label',group.name),el('span','luci-folder-count',group.count+'  ›'));list.append(b);}for(const file of entries.files){const b=button(search.value?file.path:file.path.split('/').pop(),()=>{row.name=file.name;row.words=[];row.selected=[];row.min=null;row.max=null;save();close();});b.title=file.path;list.append(b);}if(!list.children.length)list.append(el('p','','No matching LoRAs. Put files in models/loras and Refresh.'));};search.oninput=populate;populate();search.focus();}
 function actions(row){const panel=modal('LoRA actions');const index=state.rows.indexOf(row);for(const [label,d] of [['Move up',-1],['Move down',1]]){const b=button(label,()=>{state.rows=moveRow(state.rows,row.id,d);save();close();});b.disabled=index+d<0||index+d>=state.rows.length;panel.append(b);}panel.append(button('Duplicate LoRA',()=>{state.rows.splice(index+1,0,{...structuredClone(row),id:crypto.randomUUID()});save(true);close();}));const del=button('Delete this LoRA',()=>{state.rows=state.rows.filter(r=>r.id!==row.id);save(true);close();});del.className='luci-danger';panel.append(del);}
 async function details(row){active=row.id;render();const panel=modal(row.name||'LoRA details');const filename=el('p','luci-muted',row.name||'Choose a LoRA first');panel.append(filename);const meta=el('p','luci-muted','Reading local metadata…');panel.append(meta);const section=el('section');section.append(el('h4','','Suggested strength'),el('p','luci-muted','User-defined guidance, not a guaranteed best setting.'));const range=el('div','luci-pair');range.append(number('Low',row.min,n=>{row.min=n;save();}),number('Max',row.max,n=>{row.max=n;save();}));section.append(range);panel.append(section);const triggers=el('section');triggers.append(el('h4','','Trigger words'));const chips=el('div','luci-chips');const drawChips=()=>{chips.replaceChildren();for(const word of row.words){const chip=button(word,()=>{row.selected=row.selected.includes(word)?row.selected.filter(w=>w!==word):[...row.selected,word];save();drawChips();});chip.className=row.selected.includes(word)?'chosen':'';chip.setAttribute('aria-pressed',row.selected.includes(word));chips.append(chip);}};const tools=el('div','luci-tools');tools.append(button('All',()=>{row.selected=[...row.words];save();drawChips();}),button('None',()=>{row.selected=[];save();drawChips();}));triggers.append(el('p','luci-muted','Selected words from enabled, available LoRAs reach the triggers output.'),tools,chips);const form=el('form','luci-form');const input=el('input');input.placeholder='Add your own trigger word…';input.setAttribute('aria-label','Custom trigger word');const add=el('button','','Add');form.append(input,add);form.onsubmit=e=>{e.preventDefault();const word=input.value.trim();if(word){row.words=[...new Set([...row.words,word])];row.selected=[...new Set([...row.selected,word])];input.value='';save();drawChips();}};triggers.append(form);panel.append(triggers);drawChips();onlineDetails(panel,row,drawChips);try{const response=await api.fetchApi('/luci/lora/info?name='+encodeURIComponent(row.name));if(!response.ok)throw Error('Metadata unavailable');const info=await response.json();if(removed||dialog?.firstChild!==panel)return;meta.textContent=info.missing?'Missing file · skipped during execution':info.warning?'Metadata unavailable: '+info.warning:`${info.family||'Unknown model family'} · ${info.size?(info.size/1024/1024).toFixed(1)+' MB':'Local file'}`;const before=JSON.stringify(row.words);row.words=[...new Set([...row.words,...(info.words||[])])];if(before!==JSON.stringify(row.words))save();drawChips();}catch{meta.textContent='Metadata unavailable. You can still add your own words.';}}
 function savedStacks(){const panel=modal('Saved LoRA stacks');panel.append(el('p','luci-muted','Saves every LoRA, both strengths, toggles, ranges and selected trigger words in this browser.'));const name=el('input');name.placeholder='Stack name';name.setAttribute('aria-label','Stack name');panel.append(name,button('Save current stack',()=>{if(!name.value.trim())return;try{const all=presets();all[name.value.trim()]=structuredClone(state);localStorage.setItem(PRESETS,JSON.stringify(all));close();}catch{panel.append(el('p','luci-danger','Browser storage unavailable. Workflow saving still preserves this node.'));}}));for(const [key,s] of Object.entries(presets())){panel.append(button('Load '+key,()=>{state=readState(JSON.stringify(s));save(true);close();}));}}
 function render(){
  // An unbounded DOM widget can occupy canvas space far below the node.
  // Explicit bounds complement the renderer's min/max height callbacks.
  root.style.height=contentHeight()+'px';
  root.style.maxHeight=contentHeight()+'px';
  root.style.pointerEvents='none';
  root.replaceChildren();
  const bar=el('div','luci-toolbar');
  const toggle=button('',()=>{const on=!state.rows.some(r=>r.on);state.rows.forEach(r=>r.on=on);save();},'Toggle all LoRAs');
  toggle.className='luci-toggle '+(state.rows.some(r=>r.on)?'on':'');
  toggle.disabled=!state.rows.length;
  bar.append(toggle,el('span','',state.rows.length?`${state.rows.filter(r=>r.on).length} / ${state.rows.length} on`:'No LoRAs'),iconButton('↻',refresh,'Refresh LoRA list'),iconButton('⚙',settings,'LoRA settings'));
  root.append(bar);
  if(state.rows.length){
   const list=el('div','luci-stack');
   for(const row of state.rows){
    const missing=files!==null&&row.name&&!files.includes(row.name);
    const card=el('div','luci-row'+(missing?' missing':'')+(active===row.id?' selected':''));
    card.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();actions(row);};
    const controls=el('div','luci-controls'),toggle=button('',()=>{row.on=!row.on;save();},'Enable '+(row.name||'LoRA'));
    toggle.className='luci-toggle '+(row.on?'on':'');toggle.setAttribute('aria-pressed',row.on);
    const displayName=state.hideExtension?row.name.replace(/\.(safetensors|pt|pth|ckpt)$/i,''):row.name;
    const name=button(displayName||'Choose a LoRA…',()=>picker(row));name.className='luci-name';name.title=row.name;
    const pair=el('div','luci-pair');
    pair.append(strength('MODEL',row.model,n=>{row.model=n;save();}),strength('CLIP',row.clip,n=>{row.clip=n;save();}));
    controls.append(toggle,name,pair,button('i',()=>details(row),'Information '+row.name));
    const caption=el('div','luci-caption');
    const words=el('span','luci-trigger-caption',missing?'Missing file · skipped':row.selected.join(', ')||'No trigger words selected');
    words.title=missing?'Missing file · will be skipped':row.selected.join(', ')||'Right-click this row for LoRA actions';
    const labels=el('div','luci-strength-labels');labels.append(el('span','','MODEL'),el('span','','CLIP'));
    if(row.min!=null&&row.max!=null)labels.title=`${row.min}–${row.max} suggested strength`;
    caption.append(words,labels);card.append(controls,caption);list.append(card);
   }
   root.append(list);
  }
  const add=button('+ Add LoRA',()=>{if(state.rows.length>=256)return;state.rows.push({...makeRow(),model:state.defaultStrength??1,clip:state.defaultStrength??1});save(true);});
  add.className='luci-add';const addArea=el('div','luci-add-area');addArea.append(add);root.append(addArea);
  if(node._luciStatus)root.append(el('p','luci-summary',node._luciStatus));
 }
 const configure=node.onConfigure;node.onConfigure=function(){const out=configure?.apply(this,arguments);node.color='#202020';node.bgcolor='#282828';queueMicrotask(()=>{state=readState(value.value);last=value.value;render();fitHeight();});return out;};
 const draw=node.onDrawForeground;node.onDrawForeground=function(){markWidgetHosts();if(value.value!==last){state=readState(value.value);last=value.value;render();}return draw?.apply(this,arguments);};
 const execute=node.onExecuted;node.onExecuted=function(message){execute?.apply(this,arguments);const s=message?.luci_status?.[0];if(s){this._luciStatus=`${s.applied} applied · ${s.missing.length} missing`;refresh();}};
 const remove=node.onRemoved;node.onRemoved=function(){removed=true;close();return remove?.apply(this,arguments);};
 // DOM interaction must not open the native whole-node context menu.
 for(const event of ['pointerdown','mousedown','dblclick'])root.addEventListener(event,e=>e.stopPropagation());
 const resize=node.onResize;node.onResize=function(size){size[0]=Math.max(380,size[0]);size[1]=Math.max(contentHeight()+90,size[1]);return resize?.apply(this,arguments);};
 render();refresh();
}
app.registerExtension({name:'Luci.LoRALoader',beforeRegisterNodeDef(nodeType,data){if(data.name!==CLASS)return;const created=nodeType.prototype.onNodeCreated;nodeType.prototype.onNodeCreated=function(){const result=created?.apply(this,arguments);install(this);return result;};}});
