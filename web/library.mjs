// Browser-local filename preferences; never change workflow node identities.
export const LIBRARY_KEY='luci.lora.library.v1';
export function readLibrary(storage=globalThis.localStorage){try{return JSON.parse(storage.getItem(LIBRARY_KEY)||'{}');}catch{return {};}}
export function libraryEntry(name,storage=globalThis.localStorage){return readLibrary(storage)[name]||{};}
export function updateLibrary(name,patch,storage=globalThis.localStorage){if(!name)return false;try{const all=readLibrary(storage);all[name]={...all[name],...patch};storage.setItem(LIBRARY_KEY,JSON.stringify(all));return true;}catch{return false;}}
