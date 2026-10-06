import test from 'node:test';
import assert from 'node:assert/strict';
import {libraryEntry,updateLibrary} from '../web/library.mjs';
test('favorites and lookup metadata share filename across rows and preserve each other',()=>{let value;const storage={getItem:()=>value,setItem:(_,v)=>value=v};assert.equal(updateLibrary('a',{favorite:true},storage),true);updateLibrary('a',{metadata:{name:'Model',words:['creator']}},storage);assert.equal(libraryEntry('a',storage).favorite,true);assert.equal(libraryEntry('a',storage).metadata.name,'Model');assert.deepEqual(libraryEntry('b',storage),{});updateLibrary('a',{favorite:false},storage);assert.equal(libraryEntry('a',storage).metadata.name,'Model');});
test('unavailable storage and empty filenames are safe',()=>{const storage={getItem(){throw Error();},setItem(){throw Error();}};assert.deepEqual(libraryEntry('a',storage),{});assert.equal(updateLibrary('a',{favorite:true},storage),false);assert.equal(updateLibrary('',{},storage),false);});
