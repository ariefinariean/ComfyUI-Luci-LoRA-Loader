export function folderEntries(files, folder='', search='') {
 const query=search.trim().toLowerCase();
 const normalized=files.map(name=>({name,path:name.replaceAll('\\','/')}));
 if(query)return {folders:[],files:normalized.filter(f=>f.path.toLowerCase().includes(query))};
 const prefix=folder?folder+'/':'';
 const groups=new Map(), direct=[];
 for(const file of normalized){if(!file.path.startsWith(prefix))continue;const rest=file.path.slice(prefix.length),slash=rest.indexOf('/');if(slash<0)direct.push(file);else{const name=rest.slice(0,slash);groups.set(name,(groups.get(name)||0)+1);}}
 return {folders:[...groups].sort(([a],[b])=>a.localeCompare(b)).map(([name,count])=>({name,count,path:prefix+name})),files:direct.sort((a,b)=>a.path.localeCompare(b.path))};
}
