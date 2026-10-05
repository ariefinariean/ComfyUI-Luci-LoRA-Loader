export const emptyState=()=>({rows:[],cache:'last'});
export function readState(value){try{const s=JSON.parse(value);if(!s||!Array.isArray(s.rows))return emptyState();return {...s,rows:s.rows.map(r=>({...r,id:r.id||crypto.randomUUID(),words:Array.isArray(r.words)?r.words:[],selected:Array.isArray(r.selected)?r.selected:[]}))};}catch{return emptyState();}}
export function makeRow(name=''){return {id:crypto.randomUUID(),name,on:true,model:1,clip:1,min:null,max:null,words:[],selected:[]};}
export function moveRow(rows,id,d){const a=[...rows],i=a.findIndex(r=>r.id===id),j=i+d;if(i>=0&&j>=0&&j<a.length)[a[i],a[j]]=[a[j],a[i]];return a;}
